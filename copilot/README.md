# Copilot agents (shared)

This project includes shared Copilot agents as a **git submodule** at:

- `.github/agents` (source repo: `zsalerno17/copilot-agents`)

## Clone (recommended)
```bash
git clone --recurse-submodules <repo-url>
```

## If you already cloned
```bash
git submodule update --init --recursive
```

## Updating agents in this project
Agents are updated by bumping the submodule pointer:

```bash
cd .github/agents
git pull origin main

cd ../..
git add .github/agents
git push
```

## Contributing changes to agents
Do **not** edit files inside `.github/agents` in this repo.

Instead:
1. Make a change in `zsalerno17/copilot-agents`
2. Then update this repo's submodule pointer using the steps above
