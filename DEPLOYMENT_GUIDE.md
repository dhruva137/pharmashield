# ShockMap Deployment Guide

This guide covers deploying the ShockMap platform to **Hugging Face Spaces** (Backend + Frontend unified) or deploying them separately (HF Spaces for Backend, Netlify for Frontend).

## Option 1: Unified Deployment on Hugging Face Spaces (Easiest & Recommended)

Hugging Face Spaces provides a free Docker environment. We've updated the `Dockerfile` and `main.py` so that it builds the React frontend and serves it directly from the FastAPI backend.

### 1. Create the Hugging Face Space
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. **Space name:** `shockmap` (or any name you prefer).
3. **License:** OpenRAIL or MIT.
4. **Select the Space SDK:** Choose **Docker** -> **Blank**.
5. **Space Hardware:** Free (2 vCPU, 16GB RAM) is sufficient.
6. Click **Create Space**.

### 2. Set Secrets (Environment Variables)
In your Space settings, go to the **Variables and secrets** section.
Add the following **Secrets**:
*   `GEMINI_API_KEY` (Required for NER and RAG)
*   `QDRANT_URL` (Required for Vector Search - *Use your Qdrant Cloud Cluster URL*)
*   `QDRANT_API_KEY` (Required for Vector Search)

Add the following **Variables** (if you want to override defaults):
*   `DEMO_MODE` = `true` (Highly recommended for stable hackathon demos)
*   `ENABLE_GNN` = `false`

### 3. Push Code to Hugging Face
You can push your code using Git.

```bash
# Add the HF Space remote (replace with your actual username/space name)
git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/shockmap

# Push the code
git push hf main
```
*Note: Hugging Face will automatically detect the `Dockerfile`, build the React app, install Python dependencies, and start the unified server on port 7860.*

Your app will be live at `https://huggingface.co/spaces/YOUR_HF_USERNAME/shockmap`.

---

## Option 2: Split Deployment (HF Spaces Backend + Netlify Frontend)

If you prefer to host the frontend on Netlify for faster global CDN delivery, follow these steps.

### Step 1: Deploy Backend to Hugging Face Spaces
1. Follow the exact same steps in **Option 1** to create the Space and add secrets.
2. Push the code.
3. Once deployed, get your Space's direct URL. It usually looks like: `https://your-username-shockmap.hf.space` (Click the "Embed this Space" button to find the direct URL if needed).

### Step 2: Deploy Frontend to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repository containing ShockMap.
4. **Build settings:**
    *   **Base directory:** `frontend`
    *   **Build command:** `npm install --legacy-peer-deps && npm run build`
    *   **Publish directory:** `frontend/dist`
5. **Environment Variables:**
    *   Add a new variable named `VITE_BACKEND_URL`.
    *   Set the value to your Hugging Face Space URL from Step 1 (e.g., `https://your-username-shockmap.hf.space`). *Do not include a trailing slash.*
6. Click **Deploy site**.

### Crucial Fixes Applied for Deployment Success
1.  **CORS Allowed Origins:** The `backend/app/config.py` has been updated to accept `https://*.hf.space`, `https://*.netlify.app`, and `*`. This prevents the "Failed to fetch" errors.
2.  **Netlify Proxying:** The `netlify.toml` file has been configured to route `/api/*` and `/healthz` directly to your backend if you prefer API proxying instead of direct cross-origin calls.
3.  **Unified Dockerfile:** The `Dockerfile` now installs Node.js, builds the React app, and copies it to `/app/static`.
4.  **FastAPI Static Mounting:** `main.py` now includes a `StaticFiles` mount that checks for `/app/static` and serves it on the root URL, falling back to `index.html` for React Router to work properly.

---

## Post-Deployment Checklist for Hackathon Demo

1.  **Verify Data APIs:** Open your live URL and ensure the live shock feed connects correctly.
2.  **Test the Globe:** Navigate to `/globe` and ensure the CartoDB tiles load (they do not require an API key).
3.  **Check the "War Room":** Run a simulation in the `/simulate` tab to confirm Engine 2 (PageRank) executes quickly on the cloud instance.
4.  **Confirm RAG:** Go to the `/query` tab (Ask ShockMap) and ask a question to verify that Gemini can successfully contact your Qdrant cluster.
