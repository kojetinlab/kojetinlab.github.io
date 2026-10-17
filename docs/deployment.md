# Publishing to GitHub Pages

This walkthrough replaces the old website files in the existing repository while preserving its history. You do not need to delete the repository or create a new GitHub account.

| Purpose | Address |
| --- | --- |
| GitHub account | `kojetinlab` |
| Repository: where the editable source lives | https://github.com/kojetinlab/kojetinlab.github.io |
| Website: what visitors will see after publishing | https://kojetinlab.github.io/ |

The spelling includes the **n** in `kojetinlab`. GitHub's user-site address must match the account name. A public repository supports GitHub Pages on the free plan.

These are instructions for you to carry out. The new source package has not itself been pushed or deployed. The current repository's settings have not been inspected from an authenticated account.

## 1. Sign in and install GitHub Desktop

1. Sign in at [github.com](https://github.com/) using `kojetinlab`.
2. Open the repository link above. You should be able to see its **Settings** tab when signed in with administrative access.
3. Download [GitHub Desktop for Mac](https://desktop.github.com/download/). Choose Apple silicon for an M-series Mac, or Intel for an Intel Mac. **Apple menu → About This Mac** shows which you have.
4. Install and open GitHub Desktop, choose **Sign in to GitHub.com**, and complete the browser sign-in. Configure the name and email it should attach to your commits when prompted.

A *repository* is the website's source folder plus its change history. A *commit* records a set of edits locally; a *push* uploads those commits to GitHub.

## 2. Clone the existing repository

In GitHub Desktop, choose **File → Clone Repository → URL** and enter:

```text
https://github.com/kojetinlab/kojetinlab.github.io
```

Choose a local folder, such as `Documents/GitHub/kojetinlab.github.io`, then click **Clone**. This creates a working copy on your Mac.

Note the name shown under **Current Branch**. Use the repository's default branch for the steps below; after a fresh clone it should already be selected. It may be `master` or `main`. The included publishing workflow supports either without renaming it. If GitHub Desktop asks how you intend to use a fork, choose the option to work on it for your own purposes.

## 3. Save the old site

Before replacing files:

1. In GitHub Desktop, click **Current Branch → New Branch**.
2. Name it `backup-before-redesign` and create it from the current default branch.
3. Click **Publish branch** to store that snapshot on GitHub.
4. Use **Current Branch** to switch back to the default branch you noted in step 2.

You now have a named copy of the old source and its history. This backup is not a second published website. All subsequent replacement edits belong on the default branch, not the backup branch.

If v5.7 or v5.8 is already committed and pushed, follow [Importing release updates](release-updates.md) for the reusable rsync updater. The full replacement steps below are for the original redesign.

## 4. Replace the source files

1. Unzip **Kojetin-Lab-Website-v5.13.4.zip**.
2. Open the extracted `kojetinlab-website` folder. That is the new source.
3. In GitHub Desktop, choose **Repository → Show in Finder** to open your cloned `kojetinlab.github.io` folder. That is the destination.
4. In Finder, press **Command-Shift-period** to show hidden files in both folders.
5. In the destination, move the old site's files and folders to the Trash, **keeping the hidden `.git` folder**. Keep the destination folder itself. The `.git` folder holds the repository connection and history.
6. Copy **everything inside** the extracted `kojetinlab-website` source folder into the destination, including hidden items such as `.github`, `.gitignore`, and `.ruby-version`.

Replace the old contents completely; merging only selected folders can leave obsolete pages and workflows active. You should see `README.md`, `Gemfile`, `_config.yml`, `_data`, `assets`, and `.github` directly inside `kojetinlab.github.io`.

Do not place an extra `kojetinlab-website` folder inside the repository. The ZIP, standalone preview HTML, and OPEN FIRST file alongside the source folder are download aids and do not need to be copied into the repository.

The new `.gitignore` excludes local dependencies and generated work. It deliberately includes `assets/js/vendor/`, which contains Mol*.

## 5. Set GitHub Pages to use the supplied workflow

In your browser, open the repository:

1. Choose **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. GitHub may suggest starter workflows. Skip those; this package already contains `.github/workflows/pages.yml`.

For the requested `kojetinlab.github.io` address, **Custom domain** should be empty. Do not enter `kojetinlab.github.io` in that field. No purchased domain or DNS setup is needed.

If a custom domain is already configured, record its name before changing it. **Remove** clears the repository's custom-domain association so you can use the GitHub address directly; it also stops this repository from serving that old domain. If that domain must stay online, arrange its replacement hosting first. Update or remove DNS records that would otherwise keep pointing that retired domain to GitHub; preserve mail and unrelated records. This package contains no `CNAME` file.

## 6. Commit and push the replacement

Back in GitHub Desktop:

1. Confirm **Current Branch** is the default branch.
2. Review the **Changes** list. Many additions, modifications, and deletions are expected for a complete redesign.
3. Enter a summary such as `Replace old website with Kojetin Laboratory redesign`.
4. Click **Commit to [your branch name]**.
5. Click **Push origin**.

The commit saves the replacement on your computer. The push sends it to GitHub and starts the build that will replace the published website. GitHub Desktop handles authentication; no command-line Git setup or access token is needed for this normal sign-in flow.

## 7. Watch the build and open your site

On GitHub, open **Actions → Build and publish GitHub Pages** and click the newest run. Its **build** and **deploy** jobs should finish successfully.

Then visit **https://kojetinlab.github.io/** or use **Settings → Pages → Visit site**. Publishing may take several minutes; GitHub advises allowing up to ten minutes after a push.

The repository's Code page displays the new README automatically. The website's footer links back to that repository.

## 8. Make your first settings change

Open the cloned repository in a plain-text/code editor. Edit `_data/display.yml`, for example:

```yaml
site_palette: vandy
molecular_structure: 6oni
molstar_illustrative: true
molstar_ssgi: true
remember_choices: true
```

This changes the default structure to 6ONI. Use `6onj` to switch back. Each structure's camera lives in `_data/structures.yml`.

Save, preview locally if desired, then commit and push through GitHub Desktop. The workflow rebuilds and publishes automatically. On the website, use **Site defaults** in the arrow menu to clear earlier saved choices. The dropdowns themselves change only that browser's preferences.

For live local rebuilding, follow [Local development on a Mac](local-development.md). Local edits are private to your working copy until you push. For unpublished experiments, create a separate branch and preview locally; merge it into the default branch when ready. The workflow checks pull requests but deploys only the default branch.

## If something does not work

| Symptom | What to check |
| --- | --- |
| No workflow appears | Confirm `.github/workflows/pages.yml` is in the repository root and was included in the commit. In a fork, enable Actions if GitHub displays an enable-workflows prompt. |
| Workflow is skipped | Confirm you pushed to the repository's default branch. Backup/experiment branches do not deploy. |
| Pages configuration error or 404 in the build log | Confirm **Settings → Pages → Source: GitHub Actions**, then rerun the failed workflow. |
| Deployment is blocked by environment branch rules | Open **Settings → Environments → github-pages** and allow your intended default branch under its deployment-branch settings. |
| Red build/deploy job | Open the failed job and expand its first failed step. Copy that error when asking for help. The last successful deployment remains online. |
| Site still shows the old design | Wait for the newest deployment to finish, then refresh. Confirm the browser URL is the GitHub address and the source files are not nested in an extra folder. |
| Site redirects to a different domain | Check **Settings → Pages → Custom domain**; see step 5. |
| Palette or PDB ignores a new default | Click **Site defaults** in the website's arrow menu. Saved preferences take priority. |
| Molecular viewer is missing | Confirm `assets/js/vendor/molstar/molstar.js` was committed and that the browser supports WebGL. The page uses a still image if WebGL is unavailable. |

## Official references

- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [GitHub Desktop cloning](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)
- [Managing and publishing branches](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-branches-in-github-desktop)
- [Committing changes](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop)
- [Pushing changes](https://docs.github.com/en/desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop)
- [Choosing GitHub Actions as the Pages source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Managing or removing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
