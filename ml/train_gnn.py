"""
PharmaShield / ShockMap — GNN Training Script
GraphSAGE implemented in pure PyTorch (no torch_geometric dependency).
This avoids DLL issues from xxhash and makes the model fully portable.
"""

import json
import logging
import numpy as np
import torch
import torch.nn as nn
from torch.optim import Adam
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("train_gnn")

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data" / "seed"
WEIGHTS_DIR = BASE_DIR / "ml" / "weights"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

torch.manual_seed(42)


# ---------------------------------------------------------------------------
# Pure-PyTorch GraphSAGE layer (mean aggregation)
# ---------------------------------------------------------------------------
class SAGEConvPure(nn.Module):
    """
    1-hop GraphSAGE with mean aggregation.
    out_i = Linear(concat(x_i, mean(x_neighbours)))
    """
    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        self.W = nn.Linear(in_dim * 2, out_dim, bias=True)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        x          : (N, in_dim)
        edge_index : (2, E) — row 0 = source, row 1 = target
        """
        N = x.size(0)
        src, dst = edge_index[0], edge_index[1]

        # Accumulate neighbour sum per target node
        agg = torch.zeros(N, x.size(1), dtype=x.dtype)
        count = torch.zeros(N, 1, dtype=x.dtype)
        agg.scatter_add_(0, dst.unsqueeze(1).expand(-1, x.size(1)), x[src])
        count.scatter_add_(0, dst.unsqueeze(1), torch.ones(len(dst), 1))

        # Mean (avoid divide-by-zero for isolated nodes)
        count = count.clamp(min=1.0)
        neigh_mean = agg / count

        combined = torch.cat([x, neigh_mean], dim=1)
        return self.W(combined)


class ShockGNN(nn.Module):
    def __init__(self, in_dim: int = 12, hidden: int = 32):
        super().__init__()
        self.conv = SAGEConvPure(in_dim, hidden)
        self.head = nn.Linear(hidden, 1)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        h = torch.relu(self.conv(x, edge_index))
        return torch.sigmoid(self.head(h)).squeeze(-1)


# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------
def load_json(name: str) -> list:
    path = DATA_DIR / name
    if not path.exists():
        logger.error(f"Missing: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_node_features(node_type: str, data: dict,
                      is_shocked=0, shock_severity=0, shock_duration=0) -> list:
    feat = [0.0] * 12
    if node_type == "drug":
        feat[0] = 1.0
        feat[3] = np.log10(max(1000, data.get("patient_population_estimate", 1000))) / 9.0
        tier = data.get("nlem_tier", "TIER_3")
        if tier == "TIER_1":   feat[4] = 1.0
        elif tier == "TIER_2": feat[5] = 1.0
        else:                  feat[6] = 1.0
        feat[7] = 1.0 if data.get("has_substitute") else 0.0
    elif node_type == "api":
        feat[1] = 1.0
        vol = data.get("monthly_import_value_usd_millions", 0) or 0
        feat[3] = np.log10(max(1, vol * 1e6)) / 9.0
        feat[8] = data.get("china_share", 0) or 0
    elif node_type == "province":
        feat[2] = 1.0
        feat[9]  = float(is_shocked)
        feat[10] = float(shock_severity)
        feat[11] = float(shock_duration) / 30.0
    return feat


# ---------------------------------------------------------------------------
# Label generator: BFS propagation along edge weights
# ---------------------------------------------------------------------------
def get_labels(all_nodes, adj: dict, shocked_province: str, severity: float) -> torch.Tensor:
    labels = torch.zeros(len(all_nodes))
    for i, (node_id, node_type, _) in enumerate(all_nodes):
        if node_type != "drug":
            continue
        risk = 0.0
        for api in adj.get(node_id, {}):
            if shocked_province in adj.get(api, {}):
                w_da = adj[node_id][api]
                w_ap = adj[api][shocked_province]
                risk += w_da * w_ap * severity
        labels[i] = min(1.0, risk)
    return labels


# ---------------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------------
def train():
    logger.info("Loading seed data...")
    drugs        = load_json("drugs.json")
    apis         = load_json("apis.json")
    dependencies = load_json("dependencies.json")

    if not drugs or not apis or not dependencies:
        logger.error("Required seed data missing. Aborting.")
        return

    # Build node list
    all_nodes: list[tuple] = []
    for d in drugs: all_nodes.append((d["id"], "drug",     d))
    for a in apis:  all_nodes.append((a["id"], "api",      a))

    provinces = set()
    for a in apis:
        for p in a.get("primary_provinces", []):
            provinces.add(p)
    for p in sorted(provinces):
        all_nodes.append((p, "province", {}))

    id_to_idx = {n[0]: i for i, n in enumerate(all_nodes)}

    # Base feature matrix
    X_base = torch.tensor(
        [get_node_features(n[1], n[2]) for n in all_nodes],
        dtype=torch.float
    )

    # Edge index
    valid_edges = [
        e for e in dependencies
        if e["source"] in id_to_idx and e["target"] in id_to_idx
    ]
    edge_index = torch.tensor(
        [[id_to_idx[e["source"]], id_to_idx[e["target"]]] for e in valid_edges],
        dtype=torch.long
    ).t().contiguous()  # shape (2, E)

    # Adjacency dict for label computation
    adj: dict[str, dict[str, float]] = {}
    for e in valid_edges:
        adj.setdefault(e["source"], {})[e["target"]] = e.get("weight", 1.0)

    # Generate training scenarios
    scenarios = []
    prov_list = sorted(provinces)

    # Anchored real scenarios from historical disruptions
    historical = load_json("historical_disruptions.json")
    for event in historical:
        prov = event.get("province", "Hebei")
        if prov not in id_to_idx:
            continue
        X = X_base.clone()
        p_idx = id_to_idx[prov]
        X[p_idx, 9]  = 1.0
        X[p_idx, 10] = 1.0
        X[p_idx, 11] = event.get("lead_time_days", 21) / 30.0
        y = get_labels(all_nodes, adj, prov, 1.0)
        scenarios.append((X, edge_index, y))

    # Synthetic augmentation (100 random province × severity combos)
    rng = np.random.default_rng(42)
    for _ in range(100):
        prov = rng.choice(prov_list)
        sev  = float(rng.uniform(0.3, 1.0))
        dur  = float(rng.choice([7, 14, 21, 30, 45]))
        X = X_base.clone()
        p_idx = id_to_idx[prov]
        X[p_idx, 9]  = 1.0
        X[p_idx, 10] = sev
        X[p_idx, 11] = dur / 30.0
        y = get_labels(all_nodes, adj, prov, sev)
        scenarios.append((X, edge_index, y))

    logger.info(f"Built {len(scenarios)} training scenarios "
                f"({len(all_nodes)} nodes, {edge_index.size(1)} edges).")

    # Model
    model     = ShockGNN(in_dim=12, hidden=32)
    optimizer = Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.MSELoss()
    drug_mask = torch.tensor([n[1] == "drug" for n in all_nodes])

    # Training loop
    model.train()
    for epoch in range(200):
        epoch_loss = 0.0
        for X, ei, y in scenarios:
            optimizer.zero_grad()
            out  = model(X, ei)
            loss = criterion(out[drug_mask], y[drug_mask])
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        if epoch % 50 == 0:
            avg = epoch_loss / len(scenarios)
            logger.info(f"Epoch {epoch:3d}  loss={avg:.5f}")

    # Save weights + metadata
    weights_file  = WEIGHTS_DIR / "gnn_v1.pt"
    metadata_file = WEIGHTS_DIR / "gnn_v1.json"

    torch.save(model.state_dict(), weights_file)

    metadata = {
        "model_type":       "GraphSAGE-Pure",
        "version":          "1.0",
        "node_feature_dim": 12,
        "hidden_channels":  32,
        "num_layers":       1,
        "id_to_idx":        id_to_idx,
        "trained_at":       datetime.utcnow().isoformat(),
        "num_nodes":        len(all_nodes),
        "num_edges":        int(edge_index.size(1)),
        "num_scenarios":    len(scenarios),
    }
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Model saved → {weights_file}")
    logger.info(f"Metadata   → {metadata_file}")

    # Quick smoke-test: Hebei full shutdown
    model.eval()
    with torch.no_grad():
        test_X = X_base.clone()
        if "Hebei" in id_to_idx:
            h_idx = id_to_idx["Hebei"]
            test_X[h_idx, 9]  = 1.0
            test_X[h_idx, 10] = 1.0
        probs = model(test_X, edge_index)
        drug_risks = [
            (n[0], float(probs[i]) * 100)
            for i, n in enumerate(all_nodes) if n[1] == "drug"
        ]
        top5 = sorted(drug_risks, key=lambda x: x[1], reverse=True)[:5]
        logger.info("Top-5 at risk (Hebei full shutdown):")
        for drug_id, score in top5:
            logger.info(f"  {drug_id:<30} {score:.1f}%")


if __name__ == "__main__":
    train()
