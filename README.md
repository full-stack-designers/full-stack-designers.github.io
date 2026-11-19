# Full Stack Designers

Free interactive tutorials for designers who want to work across the full stack, with a dated, verifiable progress log.
Published at https://full-stack-designers.github.io. Made by Clint Lewis.

## Files you may edit here
- `site-config.json`: `link_to_portfolio` and the reading aid settings. The next build uses the copy in this repo.
- `known-issues.json`: the Known Issues list on the progress log page. Set an item's `status` to `Fixed` and add its `fixed` date.

## Publishing a tutorial from its own chat
From the root of this repo: `python3 .github/publish_tutorial.py <slug> <path-to-source-html> <updated-at, e.g. 2026-11-19T18:00:00Z>`,
then commit and push. It adds the back link and the analytics snippet, and records the time in `tutorials/updated.json`.
A tutorial pushed without its time gets the push time from the `Tutorial last-updated times` Action.

## Automations
- `Stamp progress log`: stamps each entry in `learning-log/entries` with OpenTimestamps and records its Bitcoin block.
- `Tutorial last-updated times`: see above.
