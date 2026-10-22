cd C:\jade
$env:PYTHONUNBUFFERED=1
$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')
py collect.py 202310 202610 --regions new --only trade *>> regions.log
py collect.py 202310 202610 --regions new --only rent *>> regions.log
py metrics.py *>> regions.log
git add -A; git commit -q -m "expand to 88 regions (3y), favorites"; git push -q *>> regions.log
"STAGE1 DONE" | Out-File -Append regions.log
py collect.py 201601 202309 --regions new --only trade *>> regions.log
py collect.py 201601 202309 --regions new --only rent *>> regions.log
py metrics.py *>> regions.log
git add -A; git commit -q -m "88 regions 10y backfill"; git push -q *>> regions.log
"STAGE2 DONE" | Out-File -Append regions.log
