# MineGuard AI — Frontend Dashboard (Netlify Deployment)
**Branch: `Minegaurdai-frontend`** | **SIH 26008**

Industrial Conveyor Belt Defect Detection, Supervisory Health Digital Twin & Predictive Monitoring Dashboard built with React 19, TypeScript, and Tailwind CSS.

## Netlify One-Click Deployment
1. Import this repository branch (`Minegaurdai-frontend`) into Netlify.
2. Build Settings:
   - **Base directory**: Leave blank (root of branch)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (e.g. `https://mineguard-backend.onrender.com`)
   - `VITE_SUPABASE_URL`: `https://tffhdzctkfdmzamwqxal.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase public anon key (see `.env.example`)
4. Click **Deploy Site**.
