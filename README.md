# RIT Room Check Reporter

A mobile-friendly static web app for residence hall room checks. It can be hosted directly with GitHub Pages and keeps in-progress work in the phone browser so a refresh does not wipe progress.

## What it does

- Select a residence hall building and enter a room number.
- Browse compact issue categories in descending alphabetical order, expand only the categories you need, and select as many subcategories as apply.
- Shows a description box below every selected subcategory.
- Adds multiple photos from a phone camera or photo library.
- Saves each submitted room locally in the browser and displays a visible success or error message.
- Confirms before resetting the current draft or clearing all saved entries.
- Exports saved room checks as a CSV file.
- Provides a basic service worker and web app manifest so the site can be installed on supported phones.

## GitHub Pages hosting

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Choose the branch that contains these files and set the site source to the repository root.
4. Visit the generated GitHub Pages URL on a phone.

## Seeing the latest deployed version

After merging or pushing changes, GitHub Pages usually republishes the site automatically within a few minutes. If the GitHub Pages URL still shows an old version on your phone:

1. Confirm the changes are merged or pushed to the branch configured under **Settings → Pages**.
2. Wait a few minutes, then fully close and reopen the browser tab.
3. Refresh the page once while online so the service worker can download the newest files.
4. If it still looks stale, clear website data for the GitHub Pages URL or remove and re-add the home-screen app shortcut.

Saved room-check entries are stored separately in `localStorage`, so clearing website data removes saved draft/entry data from that device.

## Updating dorm/building names

The complete residence hall list is maintained in the `buildings` array near the top of `app.js`. Edit that array if the university's list changes.

## CSV format

The exported CSV includes these columns:

1. Building
2. Room Number
3. Issue
4. Subcategory
5. Description
6. Photos
7. Created At

Each selected issue/subcategory becomes its own CSV row. Photos for a room are attached to the first row for that room as data URLs so the export remains a single file.

## Privacy note

All draft and saved entry data is stored in the browser's `localStorage` on the device being used. GitHub Pages does not provide a database or server-side CSV writer, so users should download the CSV before clearing browser data or switching devices.
