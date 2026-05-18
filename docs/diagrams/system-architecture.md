# System Architecture

```mermaid
flowchart LR
  User["User"] --> Web["React/Vite Web"]
  Web --> NodeApi["Node API :8787"]
  Web --> Media["Python Media Service :8790"]
  NodeApi --> Projects["projects/<slug>/project_data.json + assets"]
  NodeApi --> Library["material-library/library_data.json + assets"]
  Media --> ProjectAssets["projects/<slug>/assets"]
```
