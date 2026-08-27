# Local install helpers. The published package is installed from npm; this is for
# running the working tree as `bb` while developing.

NAME := bb
ROOT := $(shell pwd)
TARGET := $(ROOT)/dist/bin/cli.cjs

# pnpm's global bin directory is frequently not on PATH (it wants `pnpm setup`), so the
# default is npm's global prefix, which is. Override for anywhere else:
#   make install BIN_DIR=~/.local/bin
BIN_DIR ?= $(shell npm prefix -g)/bin
LINK := $(BIN_DIR)/$(NAME)

.PHONY: all install uninstall reinstall link-status build test check lint format clean

all: build

## Build, then symlink the bin onto PATH.
install:
	@pnpm run build >/dev/null
	@mkdir -p "$(BIN_DIR)"
	@if [ -e "$(LINK)" ] && [ ! -L "$(LINK)" ]; then \
		echo "refusing to overwrite $(LINK): it exists and is not a symlink"; \
		exit 1; \
	fi
	@ln -sf "$(TARGET)" "$(LINK)"
	@echo "linked $(LINK) -> $(TARGET)"
	@case ":$$PATH:" in \
		*":$(BIN_DIR):"*) ;; \
		*) echo "warning: $(BIN_DIR) is not on your PATH";; \
	esac
	@if [ "$$(command -v $(NAME) 2>/dev/null)" = "$(LINK)" ]; then \
		echo "$(NAME) $$($(LINK) --version)"; \
	else \
		echo "note: \`$(NAME)\` on PATH resolves to $$(command -v $(NAME) 2>/dev/null || echo 'nothing')"; \
	fi

## Remove the symlink, but only if it is ours.
uninstall:
	@if [ ! -L "$(LINK)" ]; then \
		echo "nothing to remove at $(LINK)"; \
	elif [ "$$(readlink "$(LINK)")" != "$(TARGET)" ]; then \
		echo "refusing to remove $(LINK): it points at $$(readlink "$(LINK)")"; \
		exit 1; \
	else \
		rm -f "$(LINK)" && echo "removed $(LINK)"; \
	fi

reinstall: uninstall install

## Show what `bb` on PATH currently resolves to.
link-status:
	@printf 'bin dir : %s\n' "$(BIN_DIR)"
	@printf 'link    : %s\n' "$$([ -L "$(LINK)" ] && readlink "$(LINK)" || echo '(not linked)')"
	@printf 'on PATH : %s\n' "$$(command -v $(NAME) || echo '(not found)')"

build:
	@pnpm run build

test:
	@pnpm run test

check:
	@pnpm run check

lint:
	@pnpm run lint

format:
	@pnpm run format

clean:
	@rm -rf dist coverage
