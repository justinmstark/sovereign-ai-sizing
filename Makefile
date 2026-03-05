up:
	docker compose up --build -d

api:
	docker compose logs -f api

ui:
	cd ui/web && npm run dev -- --host 0.0.0.0 --port 5173
