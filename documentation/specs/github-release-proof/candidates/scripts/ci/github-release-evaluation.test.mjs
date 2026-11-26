import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGithubRelease } from "./github-release-evaluation.mjs";

const cases = [
  [
    "complete",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "PASS"
  ],
  [
    "unrelated run",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/supabase-backup.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "NOT_RUN"
  ],
  [
    "empty runs",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": []
    },
    "NOT_RUN"
  ],
  [
    "malformed alerts",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": {
        "unexpected": true
      },
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "BLOCKED_ACCESS"
  ],
  [
    "open alerts",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [
        {
          "state": "open"
        }
      ],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "FAIL"
  ],
  [
    "empty rulesets",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "FAIL"
  ],
  [
    "history bypass",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": [
            {}
          ]
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "FAIL"
  ],
  [
    "wrong candidate",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "BLOCKED_ACCESS"
  ],
  [
    "skipped CodeQL",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "skipped"
        }
      ]
    },
    "NOT_RUN"
  ],
  [
    "pending",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "queued",
          "conclusion": null
        }
      ]
    },
    "NOT_RUN"
  ],
  [
    "failed integration",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/supabase-sql-proof.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "failure"
        }
      ]
    },
    "FAIL"
  ],
  [
    "wrong branch",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "other",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "NOT_RUN"
  ],
  [
    "unknown conclusion",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "refs/heads/main"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "deletion"
            },
            {
              "type": "non_fast_forward"
            }
          ],
          "bypass_actors": []
        },
        {
          "target": "branch",
          "enforcement": "active",
          "conditions": {
            "ref_name": {
              "include": [
                "~DEFAULT_BRANCH"
              ],
              "exclude": []
            }
          },
          "rules": [
            {
              "type": "update"
            }
          ],
          "bypass_actors": [
            {
              "actor_type": "RepositoryRole",
              "actor_id": 5
            }
          ]
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "unexpected"
        }
      ]
    },
    "BLOCKED_ACCESS"
  ],
  [
    "no rule details",
    {
      "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "dependabot": [],
      "codeScanning": [],
      "secretScanning": [],
      "rulesets": [
        {
          "id": 1
        }
      ],
      "runs": [
        {
          "path": ".github/workflows/ci.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        },
        {
          "path": ".github/workflows/codeql.yml",
          "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "head_branch": "main",
          "event": "push",
          "status": "completed",
          "conclusion": "success"
        }
      ]
    },
    "BLOCKED_ACCESS"
  ]
];
for (const [label,input,expected] of cases) {
  test(label,()=>assert.equal(evaluateGithubRelease(input).status,expected));
}
