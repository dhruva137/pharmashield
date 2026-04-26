"""
Engine 2 — Supply Chain Knowledge Graph with PageRank + Louvain Community Detection.

Maintains a directed graph of drugs, APIs, rare earths, and production provinces.
Provides:
  - Personalized PageRank for shock propagation (replaces naive BFS)
  - Louvain community detection for supply cluster identification
  - HHI concentration scoring
  - Combined risk formula: R_i = PR_i × (1 - S_i) × e^(-B_i/τ) × C_community

Implements:
  - GNN-based shock propagation concepts from AAAI 2025
  - Causal ML supply chain intervention from arXiv 2024
"""

import math
import logging
from typing import List, Dict, Optional, Any, Literal, Tuple

import networkx as nx

logger = logging.getLogger("shockmap.graph")

# ─── Sector Lead-Time Constants (τ in days) ──────────────────────────────────
SECTOR_TAU = {
    "pharma": 30,
    "rare_earth": 60,
    "semiconductor": 45,
    "ev_battery": 50,
    "solar": 40,
    "defence": 90,
}


class GraphService:
    """
    Engine 2: Maintains a directed graph representation of the multi-sector
    supply chain with PageRank propagation and Louvain community detection.
    """

    def __init__(self, data_loader: Any):
        """
        Initializes the GraphService and builds the DiGraph from seed data.

        Args:
            data_loader: The data provider for drugs, APIs, rare earths, and dependencies.
        """
        self.data_loader = data_loader
        self.graph = nx.DiGraph()
        self._undirected = None  # For Louvain (needs undirected graph)
        self._communities = {}   # node_id → community_id
        self._community_labels = {}  # community_id → descriptive label
        self._community_detection_enabled = True
        self._community_detection_method = "louvain"
        self._pagerank_cache = {}
        self._build_graph()
        self._detect_communities()

    # ─── Graph Construction ──────────────────────────────────────────────

    def _build_graph(self):
        """Constructs the NetworkX graph from data_loader seed data."""
        # Add Drug nodes
        for drug in self.data_loader.get_drugs():
            self.graph.add_node(
                drug.id,
                type="drug",
                name=drug.name,
                sector="pharma",
                nlem_tier=drug.nlem_tier,
                patient_population_estimate=drug.patient_population_estimate,
                has_substitute=drug.has_substitute,
                therapeutic_class=drug.therapeutic_class,
                current_risk=drug.current_risk or 0.0,
                # Engine 2 enrichments
                substitutability=self._drug_substitutability(drug),
                buffer_days=self._estimate_buffer_days(drug),
                strategic_priority=1.0 if drug.nlem_tier.value == "TIER_1" else 0.5,
            )

        # Add API nodes and collect unique provinces
        provinces = set()
        for api in self.data_loader.get_apis():
            self.graph.add_node(
                api.id,
                type="api",
                name=api.name,
                sector="pharma",
                china_share=api.china_share,
                primary_provinces=api.primary_provinces,
                monthly_import_value_usd_millions=api.monthly_import_value_usd_millions,
                substitutability=self._api_substitutability(api),
                buffer_days=max(5, int(30 * (1 - api.china_share))),
            )
            for p in api.primary_provinces:
                provinces.add(p)

        # Add Province nodes
        for p_name in provinces:
            self.graph.add_node(
                p_name,
                type="province",
                name=p_name,
                country="China",
                sector="multi",
            )

        # Add Edges with trade_volume_share
        for edge in self.data_loader.get_dependencies():
            self.graph.add_edge(
                edge.source,
                edge.target,
                weight=edge.weight,
                edge_type=edge.edge_type,
                trade_volume_share=edge.weight,  # normalized 0-1
            )

        # Add Rare Earth nodes (from rare_earths.json if available)
        self._add_rare_earth_nodes()

        logger.info(
            f"Graph built: {self.graph.number_of_nodes()} nodes, "
            f"{self.graph.number_of_edges()} edges"
        )

    def _add_rare_earth_nodes(self):
        """Adds rare earth mineral nodes and their province edges."""
        try:
            import json
            import os
            seed_dir = self.data_loader.seed_dir
            re_path = os.path.join(seed_dir, "rare_earths.json")
            if not os.path.exists(re_path):
                return
            with open(re_path, "r", encoding="utf-8") as f:
                rare_earths = json.load(f)

            for re in rare_earths:
                node_id = re["id"]
                self.graph.add_node(
                    node_id,
                    type="input",
                    name=re["name"],
                    sector="rare_earth",
                    china_share=re.get("china_share", 0.9),
                    primary_provinces=re.get("primary_provinces", []),
                    monthly_import_value_usd_millions=re.get("monthly_import_value_usd_millions", 0),
                    end_use_sectors=re.get("end_use_sectors", []),
                    substitutability=max(0.0, 1.0 - re.get("china_share", 0.9)),
                    buffer_days=re.get("india_stockpile_days", 15),
                    strategic_priority=1.0 if re.get("criticality", 0) > 0.8 else 0.7,
                    criticality=re.get("criticality", 0.5),
                )

                # Create edges to provinces
                for prov in re.get("primary_provinces", []):
                    if not self.graph.has_node(prov):
                        self.graph.add_node(
                            prov, type="province", name=prov,
                            country="China", sector="multi"
                        )
                    share = re.get("china_share", 0.9) / max(1, len(re.get("primary_provinces", [prov])))
                    self.graph.add_edge(
                        node_id, prov,
                        weight=share,
                        edge_type="input_from_province",
                        trade_volume_share=share,
                    )
        except Exception as e:
            logger.warning(f"Failed to load rare earth nodes: {e}")

    # ─── Louvain Community Detection ─────────────────────────────────────

    def _detect_communities(self):
        """
        Runs Louvain community detection on the undirected version of the graph.
        Identifies supply chain clusters — groups of nodes that are tightly
        interconnected and likely to co-propagate shocks.
        """
        try:
            import community as community_louvain

            self._undirected = self.graph.to_undirected()
            self._communities = community_louvain.best_partition(
                self._undirected, random_state=42
            )

            # Build community summaries
            community_members: Dict[int, List[str]] = {}
            for node_id, comm_id in self._communities.items():
                community_members.setdefault(comm_id, []).append(node_id)

            # Label each community by its dominant province or sector
            for comm_id, members in community_members.items():
                provinces = [m for m in members if self.graph.nodes[m].get("type") == "province"]
                if provinces:
                    self._community_labels[comm_id] = f"{', '.join(provinces[:2])} Supply Cluster"
                else:
                    sectors = [self.graph.nodes[m].get("sector", "unknown") for m in members[:3]]
                    self._community_labels[comm_id] = f"{'|'.join(set(sectors))} Cluster {comm_id}"

            logger.info(
                f"Louvain detected {len(community_members)} communities "
                f"across {len(self._communities)} nodes"
            )

        except ImportError:
            logger.warning("python-louvain not installed. Community detection disabled.")
            self._community_detection_enabled = False
            self._community_detection_method = "disabled_missing_dependency"
            self._communities = {n: 0 for n in self.graph.nodes()}
        except Exception as e:
            logger.warning(f"Community detection failed: {e}")
            self._community_detection_enabled = False
            self._community_detection_method = "disabled_runtime_error"
            self._communities = {n: 0 for n in self.graph.nodes()}

    def get_communities(self) -> Dict[str, Any]:
        """Returns community detection results for the frontend."""
        community_data: Dict[int, Dict[str, Any]] = {}

        for node_id, comm_id in self._communities.items():
            if comm_id not in community_data:
                community_data[comm_id] = {
                    "id": comm_id,
                    "label": self._community_labels.get(comm_id, f"Cluster {comm_id}"),
                    "members": [],
                    "provinces": [],
                    "drugs": [],
                    "inputs": [],
                    "size": 0,
                }
            entry = community_data[comm_id]
            node = self.graph.nodes[node_id]
            node_type = node.get("type", "unknown")
            entry["members"].append(node_id)
            entry["size"] += 1
            if node_type == "province":
                entry["provinces"].append(node_id)
            elif node_type == "drug":
                entry["drugs"].append(node_id)
            elif node_type in ("api", "input"):
                entry["inputs"].append(node_id)

        return {
            "community_detection_enabled": self._community_detection_enabled,
            "community_detection_method": self._community_detection_method,
            "total_communities": len(community_data),
            "communities": list(community_data.values()),
        }

    def get_node_community(self, node_id: str) -> Optional[int]:
        """Returns the community ID for a given node."""
        return self._communities.get(node_id)

    def get_community_amplifier(self, community_id: int) -> float:
        """
        Returns the community amplifier C_community.
        Larger, more interconnected communities amplify shocks more.
        """
        members = [n for n, c in self._communities.items() if c == community_id]
        if not members:
            return 1.0
        # Amplifier based on community density (more edges = more amplification)
        subgraph = self._undirected.subgraph(members) if self._undirected else self.graph.subgraph(members)
        density = nx.density(subgraph) if len(members) > 1 else 0
        return 1.0 + (density * 0.5)  # Range: 1.0 to 1.5

    # ─── Personalized PageRank ───────────────────────────────────────────

    def compute_pagerank(
        self,
        shocked_node: Optional[str] = None,
        alpha: float = 0.85,
    ) -> Dict[str, float]:
        """
        Computes Personalized PageRank from a shock origin node.

        IMPORTANT: Since graph edges point drug→api→province, we run PageRank
        on the REVERSED graph when propagating from a province. This makes
        the random walk flow province→api→drug, correctly modeling how supply
        shocks propagate upstream to find affected end products.

        Args:
            shocked_node: The node where the shock originates (e.g., "Hebei")
            alpha: Damping factor (default 0.85)
        """
        cache_key = shocked_node or "__global__"
        if cache_key in self._pagerank_cache:
            return self._pagerank_cache[cache_key]

        personalization = None
        if shocked_node and self.graph.has_node(shocked_node):
            personalization = {shocked_node: 1.0}

        # Use reversed graph so PageRank flows from province → api → drug
        # This correctly models shock propagation through the supply chain
        target_graph = self.graph.reverse(copy=False)

        try:
            scores = nx.pagerank(
                target_graph,
                alpha=alpha,
                weight="trade_volume_share",
                personalization=personalization,
                max_iter=200,
            )
            self._pagerank_cache[cache_key] = scores
            return scores
        except nx.PowerIterationFailedConvergence:
            logger.warning("PageRank failed to converge, using uniform distribution")
            n = self.graph.number_of_nodes()
            return {node: 1.0 / n for node in self.graph.nodes()}

    # ─── Combined Risk Formula ───────────────────────────────────────────

    def compute_combined_risk(
        self,
        shocked_node: str,
        sector: str = "pharma",
    ) -> Dict[str, Dict[str, Any]]:
        """
        Computes the full risk score using the combined formula:

        R_i = PR_i(shock) × (1 - S_i) × e^(-B_i/τ) × C_community

        Where:
          PR_i  = Personalized PageRank from shock origin (on reversed graph)
          S_i   = Substitutability (0-1)
          B_i   = Buffer stock in days
          τ     = Sector lead time (pharma=30d, rare_earth=60d)
          C     = Community amplifier

        Returns a dict of {node_id: {score, components}} for all affected nodes.
        """
        tau = SECTOR_TAU.get(sector, 30)
        pr_scores = self.compute_pagerank(shocked_node)

        # Find max PR score for normalization (excluding the shocked node itself)
        pr_values = [v for k, v in pr_scores.items() if k != shocked_node and v > 0]
        pr_max = max(pr_values) if pr_values else 1.0

        results = {}
        for node_id, pr_score in pr_scores.items():
            if node_id == shocked_node:
                continue  # Skip the shock origin itself

            node_data = self.graph.nodes.get(node_id, {})
            node_type = node_data.get("type", "")

            # Only score drugs, APIs, and inputs — not provinces
            if node_type not in ("drug", "api", "input"):
                continue

            substitutability = node_data.get("substitutability", 0.3)
            buffer_days = max(1, node_data.get("buffer_days", 15))
            community_id = self._communities.get(node_id, 0)
            community_amp = self.get_community_amplifier(community_id)

            # Normalize PR score relative to max (so top node → ~1.0)
            pr_normalized = pr_score / pr_max if pr_max > 0 else 0

            # The combined formula
            non_substitutability = 1.0 - substitutability
            buffer_decay = math.exp(-buffer_days / tau)
            risk_raw = pr_normalized * non_substitutability * buffer_decay * community_amp

            # Scale to 0-100
            risk_score_normalized = min(100.0, risk_raw * 100)

            if risk_score_normalized > 0.5:  # Include anything meaningful
                results[node_id] = {
                    "risk_score": round(risk_score_normalized, 2),
                    "components": {
                        "pagerank": round(pr_score, 6),
                        "pagerank_normalized": round(pr_normalized, 4),
                        "non_substitutability": round(non_substitutability, 3),
                        "buffer_decay": round(buffer_decay, 3),
                        "community_amplifier": round(community_amp, 3),
                        "community_id": community_id,
                        "community_label": self._community_labels.get(community_id, ""),
                        "buffer_days": buffer_days,
                        "substitutability": round(substitutability, 3),
                    },
                    "type": node_type,
                    "name": node_data.get("name", node_id),
                    "sector": node_data.get("sector", sector),
                }

        # Sort by risk score descending
        results = dict(
            sorted(results.items(), key=lambda x: x[1]["risk_score"], reverse=True)
        )

        return results

    # ─── Existing Methods (Preserved) ────────────────────────────────────

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Returns node data in a flat dictionary format."""
        if not self.graph.has_node(node_id):
            return None

        node_data = self.graph.nodes[node_id]
        return {
            "id": node_id,
            "type": node_data.get("type"),
            "name": node_data.get("name"),
            "attributes": {k: v for k, v in node_data.items() if k not in ["type", "name"]},
        }

    def get_neighbors(
        self,
        node_id: str,
        direction: Literal["in", "out", "both"] = "out",
    ) -> List[str]:
        """Returns the IDs of neighboring nodes based on direction."""
        if not self.graph.has_node(node_id):
            return []

        if direction == "out":
            return list(self.graph.successors(node_id))
        elif direction == "in":
            return list(self.graph.predecessors(node_id))
        else:
            return list(nx.all_neighbors(self.graph, node_id))

    def get_dependency_chain(self, drug_id: str) -> List[List[str]]:
        """
        Finds all simple paths of length 1-3 starting from a drug.
        Typically captures drug -> api -> province paths.
        """
        if not self.graph.has_node(drug_id):
            return []

        all_paths = []
        # Find paths up to length 3 (Drug -> API -> Province)
        for target in self.graph.nodes():
            if target == drug_id:
                continue
            # Use short path limits to capture the direct supply chain
            paths = list(nx.all_simple_paths(self.graph, source=drug_id, target=target, cutoff=3))
            all_paths.extend(paths)

        return all_paths

    def compute_concentration_hhi(self, drug_id: str) -> float:
        """
        Calculates the Herfindahl-Hirschman Index (HHI) for a drug's geographic dependency.
        Ranges from 0 to 10000. High values indicate extreme concentration.
        """
        if not self.graph.has_node(drug_id):
            return 0.0

        # 1. Map drug to provinces with effective weights
        province_weights: Dict[str, float] = {}

        # Get APIs
        for api_id in self.graph.successors(drug_id):
            edge_da = self.graph[drug_id][api_id]
            w_da = edge_da.get("weight", 1.0)

            # Get Provinces for this API
            for prov_id in self.graph.successors(api_id):
                edge_ap = self.graph[api_id][prov_id]
                w_ap = edge_ap.get("weight", 1.0)

                # Cumulative dependency share on this province
                share = w_da * w_ap
                province_weights[prov_id] = province_weights.get(prov_id, 0.0) + share

        if not province_weights:
            return 0.0

        # 2. Calculate HHI
        total_weight = sum(province_weights.values())
        if total_weight == 0:
            return 0.0

        hhi = 0.0
        for weight in province_weights.values():
            percentage = (weight / total_weight) * 100
            hhi += percentage ** 2

        return hhi

    def get_drugs_dependent_on_province(self, province_id: str) -> List[str]:
        """
        Returns a list of drug IDs that are dependent on the given province
        by traversing the graph in reverse.
        """
        if not self.graph.has_node(province_id):
            return []

        dependent_drugs = set()
        # Traverse backwards: Province <- API <- Drug
        for api_id in self.graph.predecessors(province_id):
            for drug_id in self.graph.predecessors(api_id):
                node_data = self.graph.nodes[drug_id]
                if node_data.get("type") == "drug":
                    dependent_drugs.add(drug_id)

        # Also check rare earth inputs
        for input_id in self.graph.predecessors(province_id):
            node_data = self.graph.nodes.get(input_id, {})
            if node_data.get("type") == "input":
                dependent_drugs.add(input_id)

        return list(dependent_drugs)

    def nodes_by_type(self, node_type: str) -> List[Dict[str, Any]]:
        """Returns all nodes of a specific type (e.g., 'api', 'province')."""
        return [
            self.get_node(n)
            for n, d in self.graph.nodes(data=True)
            if d.get("type") == node_type
        ]

    def to_serializable_dict(self) -> Dict[str, Any]:
        """Converts the graph structure to a JSON-serializable dictionary."""
        nodes = []
        for n, d in self.graph.nodes(data=True):
            node_entry = {
                "id": n,
                "type": d.get("type"),
                "name": d.get("name"),
                "attributes": {k: v for k, v in d.items() if k not in ["type", "name"]},
            }
            # Add community info
            if n in self._communities:
                node_entry["community_id"] = self._communities[n]
            nodes.append(node_entry)

        edges = []
        for u, v, d in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "weight": d.get("weight"),
                "edge_type": d.get("edge_type"),
            })

        return {"nodes": nodes, "edges": edges}

    def apply_risk_scores(self, risk_map: Dict[str, float]) -> None:
        """
        Updates the 'current_risk' attribute on drug nodes based on a map of {drug_id: risk_score}.
        """
        for drug_id, risk in risk_map.items():
            if self.graph.has_node(drug_id):
                self.graph.nodes[drug_id]["current_risk"] = risk

    # ─── Private Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _drug_substitutability(drug: Any) -> float:
        """Estimates substitutability score for a drug (0=no alternatives, 1=many)."""
        if drug.has_substitute:
            return 0.6
        if drug.nlem_tier.value == "TIER_1":
            return 0.1  # Critical, hard to replace
        return 0.3

    @staticmethod
    def _api_substitutability(api: Any) -> float:
        """Estimates substitutability for an API based on China share."""
        # Higher China share = fewer alternatives = lower substitutability
        return max(0.0, 1.0 - api.china_share)

    @staticmethod
    def _estimate_buffer_days(drug: Any) -> int:
        """Estimates buffer stock in days based on drug tier and population."""
        if drug.nlem_tier.value == "TIER_1":
            return 10  # High-demand, low buffer
        elif drug.nlem_tier.value == "TIER_2":
            return 20
        return 30

    def invalidate_cache(self):
        """Clears the PageRank cache (call after graph modifications)."""
        self._pagerank_cache.clear()
