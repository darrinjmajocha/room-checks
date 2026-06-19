# RIT Room Check Reporter

A mobile-friendly static web app for residence hall room checks. It can be hosted directly with GitHub Pages and keeps in-progress work in the phone browser so a refresh does not wipe progress.

## What it does

- Provides the complete residence-hall list directly in the page, without requiring JavaScript to populate the selector.
- Shows native expandable issue categories in descending alphabetical order.
- Allows multiple sub-issues and a description for each selected item.
- Adds multiple photos from a phone camera or photo library.
- Labels saved photos in the top-left corner with the building, room number, and any issues linked to that photo.
- Renames photos as `building_room_#`, supports individual downloads, and packages all photos into one iPhone-friendly ZIP download.
- Saves submitted rooms locally in the browser.
- Produces tab-separated text that can be copied into spreadsheet columns A–E and also offers a CSV download.
- Allows each draft photo to be linked to one or more selected issues before submission.
- Confirms before submitting without photos, resetting the current draft, or clearing all saved entries.

## GitHub Pages hosting

1. Push or merge the files into the repository's `main` branch.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main`, and select `/ (root)`.
4. Wait for the Pages action to finish successfully.
5. Visit the generated GitHub Pages URL on a phone.

## Text format

The copyable text is tab-separated, does not include a header row, and contains these five columns:

1. Building Name
2. Room Number
3. Room Type (`Dorm`, `Lounge`, `Bathroom`, or `Elevator`)
4. Categories and Subcategories, formatted as `Category, Subcategory; Category, Subcategory`
5. Additional Notes, separated by semicolons in the same order as column 4

Each saved room becomes one line, with all selected category/subcategory pairs consolidated into column 4 and their notes consolidated into column 5. Copy the text and paste it directly into the first data row of Excel, Google Sheets, or another spreadsheet program. The tabs place each value in its own column. A `.txt` download of the same data and a standard `.csv` download are both available.

## Photos

Photos are compressed for browser storage as soon as they are selected. The app checks each selected photo size, scales large photos down, and lowers JPEG quality in small steps toward an approximately 180 KB target until the saved image is much smaller while keeping enough detail for room documentation. When a room is saved, the app:

1. Adds a larger, single-line `Building — Room` label in the top-left corner.
2. Adds each issue linked with **Log Issue** on its own line underneath the room label.
3. Renames each photo using `building_room_#`.
4. Stores the labeled image separately from the tab-separated room data.

In the Attach Photos section, use **Log Issue** to associate one or more currently selected category/sub-issue pairs with each photo. This step is optional. The saved-photo section supports individual **Download** buttons and a **Download all photos as ZIP** action, which creates one ZIP file instead of triggering multiple downloads on iPhone.

## Local storage and privacy

Draft text data and room entries are stored in the browser's `localStorage`, while photos are stored in the browser's IndexedDB photo store on the device being used. GitHub Pages does not provide a database. Copy/download the text and download the photos before clearing browser data or switching devices. Browser storage is limited and cannot be made unlimited from a GitHub Pages app, so large inspections should periodically export and clear completed entries. The app compresses photos before saving and keeps image data outside the main text-entry storage to better support larger inspections with many photos.

## Seeing the latest deployed version

After merging changes, wait for the GitHub Pages action to finish. The app removes the earlier offline service-worker cache so each visit loads the current GitHub Pages files. If a previously installed home-screen copy still displays an older version, remove that shortcut and open the GitHub Pages URL directly in the browser. Clearing website data removes all locally saved room data and photos.

## Resolving merge conflicts

For an update PR where the incoming side contains the newest complete app:

- Choose **Accept incoming change** for `index.html`, `app.js`, `styles.css`, and `service-worker.js`.
- Do **not** choose **Accept both changes** for those files. Doing so can duplicate scripts, controls, and cache declarations and prevent startup.
- Choose **Accept current change** only for a deliberate current-branch customization that must replace the update.
- If both versions contain something needed, manually produce one valid copy and remove all `<<<<<<<`, `=======`, and `>>>>>>>` markers.
