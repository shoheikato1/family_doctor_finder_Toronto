# Dev Log

## Through 2026-07-07: code-complete pending keys
* Commit line: v1 Bolt prototype import, canon docs + schema migration + secrets hygiene, mock agent-run hero moment, full API layer (code-complete pending provider keys), real backend wiring behind a boot-time mode switch (`VITE_FORCE_DEMO`).
* Every unconfigured provider returns an honest 503 / "not configured yet" banner. `supabase/migrations/0001_init.sql` and a `dist/` build exist. Canonical docs: `docs/canon/` (product, engineering, ontology). Live to-do: `docs/LAST-STEPS.md`.
* Safety: `caller_live_mode` stays false; real clinics are never dialled until every row of `docs/go-live-checklist.md` is owner-signed green, including the CRTC ADAD legal read.

## State at session close (2026-07-07)
* Nothing deployed, no real keys installed. Next steps are exactly `docs/LAST-STEPS.md`:
  * Stage 1 (free, live demo): run the SQL migration in Supabase, set the two Supabase keys + URL in `.env`, `npx vercel login`, deploy main + the v1.0-prototype tag, add the Vercel URL to Supabase auth config.
  * Stage 2 (Scout): Google Cloud project + Places API (New) restricted key into `GOOGLE_PLACES_API_KEY`.
  * Stage 3 (Caller dry-run): ElevenLabs plan, Twilio upgrade + 2 Canadian numbers, create the two agents, wire webhooks, set voice/telephony env vars in Vercel.
* Cross-reference: the job_search_OS mastery plan (2026-07-07) tags the Caller dry-run as the fastest production-form agent showcase, one checklist away from a demo.

## 2026-10-29 VS Code terminal labels for Claude Code vs Codex (closed, tooling only)
* Shohei asked *"I want to be able to know which ones are from the cloud code and which ones from the codec... CL for cloud code and OC for the codecs"*, pointing at the VS Code terminal tab list.
* Codex CLI 0.153.4 was already installed via Homebrew. Added two VS Code terminal profiles in the global user settings (`~/Library/Application Support/Code/User/settings.json`), `CL` (launches `claude`, yellow sparkle) and `OC` (launches `codex`, green robot), and set tab titles to `${process} ${sequence}` so each tab leads with `claude` or `codex` followed by its live topic.
* No project files changed. Not yet observed in VS Code by Shohei.
* Follow-up same day. Shohei asked *"this should be a default setting... for all the vaults... When I click on the arrow next to + how can I choose vault as well"*. CL and OC now run `~/.local/bin/vault-agent`, which lists every vault (`~/Obsidian/*` plus `~/dev/*` repos with `.obsidian`), takes a number, then starts `claude` or `codex` there. Enter keeps the current folder. Tested from the shell (pick, Enter, bad number), not yet in VS Code.
* Follow-up. Shohei asked *"can I rearragent the vault order?"*. Added an order file at `~/.config/vault-agent/order` (one vault name per line, listed vaults first, the rest after in the default order). Seeded with video_OS and job_search_OS_v2 as a test, pending his real order.
* Order set per Shohei: job_search_OS_v2, social_content_strategy_OS, personal, video_OS, knowledge-hubs, dating_OS, then the rest. Closed.
* Follow-up. Shohei reported *"ever since I made the change, the trash icon is finicky"* with a screenshot of a crowded tab row. Removed the `terminal.integrated.tabs.title` line as a reversible test (profiles and picker kept). Ongoing, waiting on whether the trash icon behaves now.
* Follow-up. Shohei found the cause, *"when either CL or OC is running, you need to click twice, when stale, one click is all needed"*, and said *"if colour can distinguish, I dont need the CL or OC header"*. vault-agent now names the tab once after the vault and starts Claude with CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1 and Codex with tui.terminal_title=[]. Claude flag confirmed present in the binary. The Codex value is unverified. Ongoing until he confirms trash works on one click while busy.
* Closed. Shohei confirmed *"yeah I think it's all good now"*. One click on trash now works on busy CL and OC tabs.

## 2026-10-29 Voice second brain vision diagram (ongoing, belongs to dating_OS)
* Shohei asked to turn his ChatGPT discussion into a diagram, *"infuse that discussion and turn that into the diagram so that we can refine the sort of like vision"*. The share link would not render, so the text came from his clipboard (copy starts at the per-message cost question, opening missing).
* Published a private artifact, https://claude.ai/artifact/Ecs7n4AzK8MaLpoyaDens5 , combining that chat with this session. Verbatim source sits only in this session's scratchpad.
* Next: move the source and the vision into a dating_OS session, kickoff "refine the voice second brain vision from the diagram". No project files changed.
* Update. Shohei pasted the opening of the ChatGPT chat. The two copies together make the full chat. Diagram v2 adds how the idea evolved, the early local-only stance, where her words go per hosting option, the retrieval rule, and the single-generator first version. Still ongoing pending the dating_OS move.
