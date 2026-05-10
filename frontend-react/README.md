# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## API configuration

This app requires `VITE_API_URL` for authentication and API calls.

1. Copy `.env.example` to `.env`
2. Set `VITE_API_URL` to your API Gateway stage URL (example: `https://<api-id>.execute-api.us-east-1.amazonaws.com/dev`)
3. Restart the frontend dev server
