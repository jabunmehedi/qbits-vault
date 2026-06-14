# Qbits Vault

A React + Vite frontend for the Qbits Vault application.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher (comes with Node.js)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd qbits-vault
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and update the values:

   | Variable | Description | Example |
   |---|---|---|
   | `VITE_REACT_APP_API_BASE_URL` | Base URL of the backend API | `http://qbits-vault-api.test/api` |
   | `VITE_REACT_APP_STORAGE_URL` | Base URL for media/storage files | `http://qbits-vault-api.test/storage` |

   > **Note:** The `.test` domain is provided by Laravel Herd or Valet. Make sure `php artisan storage:link` has been run on the Laravel side.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/) + [redux-persist](https://github.com/rt2zz/redux-persist)
- [TanStack Query](https://tanstack.com/query)
- [React Router v6](https://reactrouter.com/)
- [Axios](https://axios-http.com/)
- [Recharts](https://recharts.org/)
- [Framer Motion](https://www.framer.com/motion/)
