# Sound pack

Recorded or generated audio that replaces PictoGen's synthesized sounds one by one. Files come in
only through the tool, so each has a source and a license on record in `manifest.json`:

    npm run sound-pack -- import <folder> --source "..." --license "..."   # files named by slot
    npm run sound-pack -- add <file> <slot> --source "..." --license "..."

What to make, file names and prompts: `docs/SOUND_PACK.md`. Without a terminal: upload the folder
to the repository (GitHub: Add file → Upload files, into `incoming-sounds/`) and ask for it to be
imported; the import prepares the files (trims, levels, converts) and the folder is removed after.
