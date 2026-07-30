# Mumbai Flood Command Center 🌊

An enterprise-grade, 3D geospatial command center designed for monitoring, analyzing, and predicting flood severities across the 24 municipal wards of Mumbai. Built with Next.js, Tailwind CSS, and CesiumJS.

## Overview

This platform serves as a digital twin for Mumbai's flood management, moving away from flat 2D maps to a fully immersive 3D environment. By combining real-world terrain elevation, 3D building data, and simulated flood volumes, it provides city planners and emergency responders with a professional, actionable view of current and predicted water levels.

## Key Features Built So Far

*   **Immersive 3D Geospatial Engine (CesiumJS):**
    *   Integrated CesiumJS replacing the old 2D MapLibre/deck.gl stack.
    *   **Real World Terrain:** Accurately reflects Mumbai's topography using Cesium World Terrain.
    *   **3D Buildings:** Real building footprints and heights powered by OpenStreetMap (OSM), styled with a professional dark aesthetic.
    *   **Dark Mode Basemaps:** Uses sleek CARTO dark imagery to ensure data overlays pop.
*   **Dynamic Flood Visualization:**
    *   All 24 BMC municipal wards mapped with precise GeoJSON boundaries.
    *   Severity-based rendering (Levels 0-3), with critical wards highlighted.
    *   **Water Volume Extrusion:** Wards with high flood severity visually extrude water depth onto the 3D terrain for immediate impact assessment.
*   **Enterprise Dashboard UI:**
    *   Moved away from amateur "glassmorphism" to a solid, high-contrast, professional design language.
    *   Command Bar for quick navigation and actions.
    *   Live Weather Widget tracking Rainfall, Soil Moisture, and Land Surface Temperature (LST).
    *   Ward Information Cards and Critical Alerts panels that float seamlessly over the 3D canvas.
*   **RAG AI Terminal (Prep):**
    *   A built-in command terminal interface designed to handle Retrieval-Augmented Generation (RAG) queries, allowing users to ask natural language questions about historical flood data and active alerts.
*   **Modern Tech Stack:**
    *   Next.js 14 (App Router)
    *   React / Zustand (State Management)
    *   Tailwind CSS (Custom dark theme)
    *   CesiumJS (3D WebGL Engine)

## Setup and Running Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Cesium Ion Token:**
    *   You need a free Cesium Ion account (ion.cesium.com).
    *   Create a `.env` file in the root directory.
    *   Add your token: `NEXT_PUBLIC_CESIUM_TOKEN=your_token_here`
3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    *(Note: The `dev` and `build` scripts automatically copy necessary Cesium web workers and static assets to the `/public` folder using `cpx2`.)*
4.  **View:** Open `http://localhost:3000/map` in your browser.

## Next Steps
*   Expand the dashboard into distinct, organized pages (e.g., Reports, Alerts).
*   Connect live weather APIs for real-time rainfall data.
*   Finalize backend AI/RAG integrations for the command terminal.
