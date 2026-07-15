WEB_DIR := apps/web
PORT ?= 4051

.PHONY: web-install web-run

web-install:
	@command -v bun >/dev/null 2>&1 || { echo "Bun is required: https://bun.sh"; exit 1; }
	@if [ ! -d "$(WEB_DIR)/node_modules" ]; then \
		echo "Installing web dependencies..."; \
		cd "$(WEB_DIR)" && bun install; \
	fi

web-run: web-install
	@cd "$(WEB_DIR)" && bun run dev -- --port "$(PORT)"
