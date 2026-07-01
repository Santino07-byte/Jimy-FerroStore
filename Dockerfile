# Imagen del backend, que tambien sirve el frontend estatico (frontend/)
# tal como espera server.js. El contexto de build es la RAIZ del proyecto.
FROM node:20-alpine

WORKDIR /app

# 1) Instalar dependencias primero (aprovecha la cache de Docker si el
#    package.json no cambio, asi no reinstala todo en cada build)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# 2) Copiar el resto del codigo (backend + frontend)
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
