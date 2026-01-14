.PHONY: dev dev-ui dev-server build build-ui build-server build-all test clean version install

# Development
dev:
	@trap 'kill 0' SIGINT; \
	(cd server && bun run dev) & \
	(cd ui && bun run dev) & \
	wait

dev-ui:
	cd ui && bun run dev

dev-server:
	cd server && bun run dev

# Build
build: build-server

build-ui:
	cd ui && bun run build
	rm -rf server/public
	cp -r ui/dist server/public

build-server:
	cd server && bun build --compile --outfile ../malamar ./src/index.ts

# Cross-platform builds
build-all:
	@mkdir -p dist
	cd server && bun build --compile --target=bun-darwin-arm64 --outfile ../dist/malamar-darwin-arm64 ./src/index.ts
	cd server && bun build --compile --target=bun-darwin-x64 --outfile ../dist/malamar-darwin-x64 ./src/index.ts
	cd server && bun build --compile --target=bun-linux-x64 --outfile ../dist/malamar-linux-x64 ./src/index.ts
	cd server && bun build --compile --target=bun-linux-arm64 --outfile ../dist/malamar-linux-arm64 ./src/index.ts
	cd server && bun build --compile --target=bun-windows-x64 --outfile ../dist/malamar-windows-x64.exe ./src/index.ts

# Testing
test:
	cd server && bun test tests/

test-e2e:
	cd server && bun test e2e/

# Install dependencies
install:
	cd server && bun install

# Utilities
clean:
	rm -rf malamar malamar.exe dist server/public server/node_modules

version:
	@cat server/package.json | grep '"version"' | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
