export type LoanProgram = {
  "version": "0.1.0",
  "name": "loan_program",
  "instructions": [
    {
      "name": "createPool",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "interestRate",
          "type": "u64"
        },
        {
          "name": "loanTermMonths",
          "type": "u64"
        },
        {
          "name": "paymentFrequency",
          "type": "u64"
        },
        {
          "name": "agreementTemplateHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "pausePool",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "pause",
          "type": "bool"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "deposit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userStats",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "agreementHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "deposit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userStats",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "type": "u64"
          },
          {
            "name": "availableForWithdraw",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "feePercent",
            "type": "u8"
          },
          {
            "name": "totalInterest",
            "type": "u64"
          },
          {
            "name": "paymentFrequency",
            "type": "u64"
          },
          {
            "name": "loanTermMonths",
            "type": "u64"
          },
          {
            "name": "maturityDate",
            "type": "i64"
          },
          {
            "name": "agreementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "agreementTemplateHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "interestRate",
            "type": "u64"
          },
          {
            "name": "loanTermMonths",
            "type": "u64"
          },
          {
            "name": "paymentFrequency",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "depositCount",
            "type": "u64"
          },
          {
            "name": "feePercent",
            "type": "u64"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds available"
    },
    {
      "code": 6001,
      "name": "ArithmeticError",
      "msg": "Arithmetic error occurred"
    },
    {
      "code": 6002,
      "name": "InvalidAccountConfig",
      "msg": "Invalid account configuration"
    },
    {
      "code": 6003,
      "name": "PoolPaused",
      "msg": "Pool is paused"
    },
    {
      "code": 6004,
      "name": "InvalidAgreement",
      "msg": "Invalid agreement hash"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6006,
      "name": "InvalidLoanTerm",
      "msg": "Invalid loan term. Loan term must be greater than zero."
    },
    {
      "code": 6007,
      "name": "InvalidPaymentFrequency",
      "msg": "Invalid payment frequency. Payment frequency must be greater than zero."
    }
  ]
};

export const IDL: LoanProgram = {
  "version": "0.1.0",
  "name": "loan_program",
  "instructions": [
    {
      "name": "createPool",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "interestRate",
          "type": "u64"
        },
        {
          "name": "loanTermMonths",
          "type": "u64"
        },
        {
          "name": "paymentFrequency",
          "type": "u64"
        },
        {
          "name": "agreementTemplateHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "pausePool",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "pause",
          "type": "bool"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "deposit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userStats",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "agreementHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "deposit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userStats",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "type": "u64"
          },
          {
            "name": "availableForWithdraw",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "feePercent",
            "type": "u8"
          },
          {
            "name": "totalInterest",
            "type": "u64"
          },
          {
            "name": "paymentFrequency",
            "type": "u64"
          },
          {
            "name": "loanTermMonths",
            "type": "u64"
          },
          {
            "name": "maturityDate",
            "type": "i64"
          },
          {
            "name": "agreementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "agreementTemplateHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "interestRate",
            "type": "u64"
          },
          {
            "name": "loanTermMonths",
            "type": "u64"
          },
          {
            "name": "paymentFrequency",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "depositCount",
            "type": "u64"
          },
          {
            "name": "feePercent",
            "type": "u64"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds available"
    },
    {
      "code": 6001,
      "name": "ArithmeticError",
      "msg": "Arithmetic error occurred"
    },
    {
      "code": 6002,
      "name": "InvalidAccountConfig",
      "msg": "Invalid account configuration"
    },
    {
      "code": 6003,
      "name": "PoolPaused",
      "msg": "Pool is paused"
    },
    {
      "code": 6004,
      "name": "InvalidAgreement",
      "msg": "Invalid agreement hash"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6006,
      "name": "InvalidLoanTerm",
      "msg": "Invalid loan term. Loan term must be greater than zero."
    },
    {
      "code": 6007,
      "name": "InvalidPaymentFrequency",
      "msg": "Invalid payment frequency. Payment frequency must be greater than zero."
    }
  ]
};
