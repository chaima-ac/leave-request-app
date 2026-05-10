# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## API configuration

This app requires `VITE_API_URL` for authentication and API calls.

1. Ensure `.env` includes `VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/dev`
2. Restart the frontend dev server after changing `.env`
