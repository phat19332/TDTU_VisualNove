@echo off
echo [1/3] Adding changes...
git add .
echo [2/3] Committing changes...
git commit -m "Update Music Player: Scene-driven BGM metadata with Supabase integration"
echo [3/3] Pushing to GitHub...
git push
echo ========================================
echo DONE! Code holds now on GitHub.
pause
