# RIT Room Check Reporter

A mobile-friendly static web app for residence hall room checks. It can be hosted directly with GitHub Pages and keeps in-progress work in the phone browser so a refresh does not wipe progress.

## What it does

- Provides the complete residence-hall list directly in the page, without requiring JavaScript to populate the selector.
- Shows native expandable issue categories in descending alphabetical order.
- Allows multiple sub-issues and a description for each selected item.
- Adds multiple photos from a phone camera or photo library.
- Labels saved photos in the top-left corner with the building and room number.
- Renames photos as `building_room_#` and makes them available as separate downloads.
- Saves submitted rooms locally in the browser.
- Produces tab-separated text that can be copied into spreadsheet columns A–E.
- Confirms before resetting the current draft or clearing all saved entries.

## GitHub Pages hosting

1. Push or merge the files into the repository's `main` branch.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main`, and select `/ (root)`.
4. Wait for the Pages action to finish successfully.
5. Visit the generated GitHub Pages URL on a phone.

## Text format

The copyable text is tab-separated and contains these five columns:

1. Building
2. Room
3. Category
4. Sub-issue
5. Description

Each selected issue/sub-issue becomes its own line. Copy the text and paste it into cell A1 of Excel, Google Sheets, or another spreadsheet program. The tabs place each value in its own column. A `.txt` download of the same data is also available.

## Photos

Photos are resized for browser storage when selected. When a room is saved, the app:

1. Adds the building name in the top-left corner.
2. Adds the room number directly below the building name.
3. Renames each photo using `building_room_#`.
4. Stores the labeled image separately from the tab-separated room data.

The saved-photo section supports individual downloads and a **Download all photos** action. Some mobile browsers may ask for permission to allow multiple downloads.

## Local storage and privacy

Drafts, room entries, and labeled photos are stored in the browser's `localStorage` on the device being used. GitHub Pages does not provide a database. Copy/download the text and download the photos before clearing browser data or switching devices. Browser storage is limited, so large inspections should periodically export and clear completed entries.

## Seeing the latest deployed version

After merging changes, wait for the GitHub Pages action to finish. The app removes the earlier offline service-worker cache so each visit loads the current GitHub Pages files. If a previously installed home-screen copy still displays an older version, remove that shortcut and open the GitHub Pages URL directly in the browser. Clearing website data removes all locally saved room data and photos.

## Resolving merge conflicts

For an update PR where the incoming side contains the newest complete app:

- Choose **Accept incoming change** for `index.html`, `app.js`, `styles.css`, and `service-worker.js`.
- Do **not** choose **Accept both changes** for those files. Doing so can duplicate scripts, controls, and cache declarations and prevent startup.
- Choose **Accept current change** only for a deliberate current-branch customization that must replace the update.
- If both versions contain something needed, manually produce one valid copy and remove all `<<<<<<<`, `=======`, and `>>>>>>>` markers.
