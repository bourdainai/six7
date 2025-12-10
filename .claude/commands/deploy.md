---
description: Push changes and get Cursor merge instructions
---

1. First, check for uncommitted changes and commit them if needed
2. Push the current branch to origin
3. Then tell the user:

**Ready for deployment! Tell Cursor:**

> Merge branch `[current-branch-name]` into main and push

This will trigger Lovable's auto-sync to deploy the changes.
