function ConvertTo-StructuredInvocation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandLine
    )

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        throw "Command must not be empty."
    }

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseInput(
        $CommandLine,
        [ref]$tokens,
        [ref]$parseErrors
    )

    if ($parseErrors.Count -gt 0 -or $null -eq $ast) {
        throw "Command could not be parsed as a single structured invocation."
    }

    $statements = @($ast.EndBlock.Statements)
    if ($statements.Count -ne 1) {
        throw "Command must contain exactly one invocation."
    }

    $pipeline = $statements[0]
    if ($pipeline -isnot [System.Management.Automation.Language.PipelineAst] -or
        $pipeline.PipelineElements.Count -ne 1) {
        throw "Command pipelines and chained commands are not allowed."
    }

    $command = $pipeline.PipelineElements[0]
    if ($command -isnot [System.Management.Automation.Language.CommandAst] -or
        $command.Redirections.Count -ne 0) {
        throw "Command redirections and non-command expressions are not allowed."
    }

    $values = [System.Collections.Generic.List[string]]::new()
    foreach ($element in @($command.CommandElements)) {
        if ($element -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
            [void]$values.Add([string]$element.Value)
            continue
        }

        if ($element -is [System.Management.Automation.Language.ExpandableStringExpressionAst] -and
            $element.NestedExpressions.Count -eq 0) {
            [void]$values.Add([string]$element.Value)
            continue
        }

        throw "Command variables, subexpressions, script blocks and expressions are not allowed."
    }

    if ($values.Count -eq 0 -or [string]::IsNullOrWhiteSpace($values[0])) {
        throw "Command executable must not be empty."
    }

    [pscustomobject]@{
        Executable = $values[0]
        Arguments = @($values | Select-Object -Skip 1)
    }
}
