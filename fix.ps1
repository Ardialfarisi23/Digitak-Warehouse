 = 'frontend\app\dashboard\boq\page.tsx'
 = [System.IO.File]::ReadAllText()
# Remove BOM if present
if (.StartsWith([char]0xFEFF)) {
     = .Substring(1)
}
# Replace literal \r\n with actual newline
 =  -replace '\\r\\n', "
"
# Now fix EMPTY_CLUSTER_FORM: replace ; with , inside the object
# Find the object start and end
 = .IndexOf('const EMPTY_CLUSTER_FORM: ClusterForm = {')
if ( -ge 0) {
    # Find the matching closing brace
     = 0
     =  + .Length
    while ( -lt .Length) {
         = []
        if ( -eq '{') { ++ }
        elseif ( -eq '}') {
            if ( -eq 0) { break }
            else { -- }
        }
        ++
    }
    if ( -lt .Length) {
         = 
         = .Substring(0, )
         = .Substring( + 1) # include the }
         = .Substring(,  -  + 1) # includes the braces
        # Replace ; with , but not the final ; before closing brace? Actually we want to replace all ; inside the braces with ,
         =  -replace ';', ','
        # Remove trailing comma before closing brace
         =  -replace ',\s*}', '}'
         =  +  + 
    }
}
# Remove leftover garbage after the export? We'll just trim trailing whitespace and ensure ends with newline
 = .TrimEnd() + "

[System.IO.File]::WriteAllText(, , [System.Text.Encoding]::UTF8)
