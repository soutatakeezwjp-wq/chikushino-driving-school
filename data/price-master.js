/*
 * 筑紫野自動車学校 料金マスター
 * 正式料金PDF（2026-08-01適用）を一次資料として作成。
 * ブラウザ: window.CDS_PRICE_MASTER
 * Google Apps Script: CDS_PRICE_MASTER
 * CommonJS: require(...)
 */
var CDS_PRICE_MASTER = (function () {
  return {
    "schemaVersion": "2026-07-18.1",
    "school": {
      "id": "chikushino-driving-school",
      "nameJa": "筑紫野自動車学校"
    },
    "effectiveDate": "2026-08-01",
    "locale": "ja-JP",
    "currency": "JPY",
    "amountUnit": "yen",
    "taxRule": "税込表記。tax が exempt の項目のみ非課税。",
    "verification": {
      "verifiedAt": "2026-07-18",
      "method": "正式PDF各1ページを250dpiで画像化し、表・内訳・注記を目視で二重照合",
      "noInference": true
    },
    "sources": [
      {
        "id": "standard-car",
        "title": "普通自動車料金表",
        "effectiveDate": "2026-08-01",
        "pages": 1,
        "copiedFile": "downloads/fees-2026-08/standard-car-fees-2026-08-01.pdf",
        "sha256": "937a6fab58beccafb06cbd16ead1ca430c57d7b063dd5d55ddc8b013bc64c0a1",
        "counts": {
          "mainFeeRows": 4,
          "licenseChangeRows": 1,
          "quotedTotals": 20
        }
      },
      {
        "id": "semi-medium",
        "title": "準中型車料金表",
        "effectiveDate": "2026-08-01",
        "pages": 1,
        "copiedFile": "downloads/fees-2026-08/semi-medium-fees-2026-08-01.pdf",
        "sha256": "9278fbadbea8387577a98d39d987f2182623c91f49da29a4c20dd607d1fa6803",
        "counts": {
          "mainFeeRows": 5,
          "licenseChangeRows": 2,
          "quotedTotals": 28
        }
      },
      {
        "id": "motorcycle",
        "title": "自動二輪車料金表",
        "effectiveDate": "2026-08-01",
        "pages": 1,
        "copiedFile": "downloads/fees-2026-08/motorcycle-fees-2026-08-01.pdf",
        "sha256": "7335d80af9b4352c3cd517182ca832b995dcca2d1224d6be18202aa79b96489e",
        "counts": {
          "mainFeeRows": 13,
          "licenseChangeRows": 6,
          "quotedTotals": 76
        }
      }
    ],
    "dimensions": {
      "plans": {
        "day": {
          "label": "デイプラン",
          "hours": "8:30〜18:30"
        },
        "free": {
          "label": "フリープラン",
          "hours": "8:30〜20:30"
        }
      },
      "customerTypes": {
        "student": {
          "label": "学生"
        },
        "general": {
          "label": "一般"
        }
      },
      "optionSeasons": {
        "aprToNov": {
          "label": "4月〜11月",
          "months": [
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ]
        },
        "decToMar": {
          "label": "12月〜3月",
          "months": [
            12,
            1,
            2,
            3
          ]
        }
      }
    },
    "catalog": {
      "standardCar": {
        "sourceId": "standard-car",
        "label": "普通車",
        "mainFeeRows": [
          {
            "id": "standard-at-none",
            "course": "普通車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "none"
            ],
            "currentLicenseLabel": "なし",
            "skillHours": 31,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 322850,
                "general": 327850
              },
              "free": {
                "student": 344850,
                "general": 349850
              }
            }
          },
          {
            "id": "standard-at-moped",
            "course": "普通車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "moped"
            ],
            "currentLicenseLabel": "原付",
            "skillHours": 31,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 319550,
                "general": 324550
              },
              "free": {
                "student": 341550,
                "general": 346550
              }
            }
          },
          {
            "id": "standard-at-motorcycle",
            "course": "普通車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "motorcycle"
            ],
            "currentLicenseLabel": "自動二輪車",
            "skillHours": 29,
            "academicHours": 2,
            "prices": {
              "day": {
                "student": 249150,
                "general": 254150
              },
              "free": {
                "student": 271150,
                "general": 276150
              }
            }
          },
          {
            "id": "standard-mt-transition-at-graduation-certificate",
            "course": "MT移行（AT解除）",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_graduation_certificate"
            ],
            "currentLicenseLabel": "AT卒業証明書",
            "skillHours": 4,
            "academicHours": 0,
            "prices": {
              "day": {
                "student": 36300,
                "general": 36300
              },
              "free": {
                "student": 36300,
                "general": 36300
              }
            }
          }
        ],
        "licenseChangeRows": [
          {
            "id": "standard-mt-license-change-from-at",
            "course": "普通車MT限定解除",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_ordinary_car"
            ],
        "currentLicenseLabel": "AT普通車",
            "skillHours": 4,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 62150,
                "general": 67150
              },
              "free": {
                "student": 67650,
                "general": 72650
              }
            }
          }
        ],
        "separateFees": [
          {
            "id": "provisional-license-exam",
            "label": "仮免試験手数料",
            "amount": 1800,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_attempt"
          },
          {
            "id": "provisional-license-issuance",
            "label": "仮免交付手数料",
            "amount": 1100,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_issuance"
          }
        ],
        "feeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 52300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson",
            "label": "技能教習料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "academic-stage-1",
            "label": "学科教習料1段階",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "academic-stage-2",
            "label": "学科教習料2段階",
            "amount": 35200,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "textbook",
            "label": "教科書代",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included",
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ]
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "effect-measurement",
            "label": "効果測定料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "expressway",
            "label": "高速通行料",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "completion-exam",
            "label": "修了検定料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "moped-lesson",
            "label": "原付講習料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "otherFees": [
          {
            "id": "extension-lesson",
            "label": "延長・補習教習料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "completion-reexam",
            "label": "修了検定再検定料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "provisional-retest",
            "label": "仮免試験再試験料",
            "amount": 1800,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_attempt"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "options": [
          {
            "id": "komikomi",
            "label": "コミコミプラン",
            "eligibleTransmissions": [
              "AT"
            ],
            "description": "延長・補習教習料・技能検定再検定料がかからないプランです",
            "pricesBySeason": {
              "aprToNov": 11000,
              "decToMar": 11000
            },
            "tax": "included"
          },
          {
            "id": "camp-style-high-speed",
            "label": "合宿風ハイスピードプラン",
            "eligibleTransmissions": [
              "AT"
            ],
            "description": "当校スケジュールに合わせて教習を進めるプランです",
            "pricesBySeason": {
              "aprToNov": 55000,
              "decToMar": 77000
            },
            "tax": "included"
          },
          {
            "id": "schedule",
            "label": "スケジュールプラン",
            "eligibleTransmissions": [
              "MT",
              "AT"
            ],
            "description": "お客様のご都合に合わせたスケジュール通りに教習を進めるプランです",
            "pricesBySeason": {
              "aprToNov": 55000,
              "decToMar": 77000
            },
            "tax": "included"
          }
        ],
        "licenseChangeFeeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 28650,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson",
            "label": "技能教習料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "licenseChangeOtherFees": [
          {
            "id": "extension-lesson",
            "label": "延長・補習教習料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "discounts": [
          {
            "id": "medical-qualification-academic-exemption",
            "label": "医師・看護師等の資格による学科教習免除",
            "amount": null,
            "benefit": {
              "academicHoursExempted": 3
            },
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ],
            "action": "窓口へ申し出"
          },
          {
            "id": "graduate-discount",
            "label": "卒業生割引",
            "amount": null,
            "amountStatus": "source_does_not_state_amount",
            "action": "窓口へ確認"
          }
        ],
        "notices": [
          "高速教習は原則、実車で行います。",
          "医師・看護師等の資格をお持ちの方は窓口へお申し出ください。学科教習が3時限免除になります。（免なし・原付持の方）",
          "当校を卒業された方は卒業生割引がございます。",
          "割引や特典の併用はできない場合がございます。",
          "途中退校（転校）の場合は当校規定により残金の精算をいたします。",
          "教習時間は時期等により変更になる場合がございます。",
          "予告なく教習料金を改定する場合がございます。"
        ]
      },
      "semiMedium": {
        "sourceId": "semi-medium",
        "label": "準中型車",
        "mainFeeRows": [
          {
            "id": "semi-medium-mt-none",
            "course": "準中型車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "none"
            ],
            "currentLicenseLabel": "なし",
            "skillHours": 41,
            "academicHours": 27,
            "prices": {
              "day": {
                "student": 401280,
                "general": 406280
              },
              "free": {
                "student": 423280,
                "general": 428280
              }
            }
          },
          {
            "id": "semi-medium-mt-moped",
            "course": "準中型車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "moped"
            ],
            "currentLicenseLabel": "原付",
            "skillHours": 41,
            "academicHours": 27,
            "prices": {
              "day": {
                "student": 397980,
                "general": 402980
              },
              "free": {
                "student": 419980,
                "general": 424980
              }
            }
          },
          {
            "id": "semi-medium-mt-motorcycle",
            "course": "準中型車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "motorcycle"
            ],
            "currentLicenseLabel": "自動二輪車",
            "skillHours": 39,
            "academicHours": 3,
            "prices": {
              "day": {
                "student": 326920,
                "general": 331920
              },
              "free": {
                "student": 348920,
                "general": 353920
              }
            }
          },
          {
            "id": "semi-medium-mt-at-ordinary-car",
            "course": "準中型車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_ordinary_car"
            ],
            "currentLicenseLabel": "AT普通車",
            "skillHours": 17,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 177760,
                "general": 182760
              },
              "free": {
                "student": 188760,
                "general": 193760
              }
            }
          },
          {
            "id": "semi-medium-mt-mt-ordinary-car",
            "course": "準中型車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "mt_ordinary_car"
            ],
            "currentLicenseLabel": "MT普通車",
            "skillHours": 13,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 152240,
                "general": 157240
              },
              "free": {
                "student": 163240,
                "general": 168240
              }
            }
          }
        ],
        "licenseChangeRows": [
          {
            "id": "semi-medium-from-at-5t-limited",
            "course": "準中型車限定解除",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_5t_limited"
            ],
            "currentLicenseLabel": "AT5t限定",
            "skillHours": 8,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 95480,
                "general": 100480
              },
              "free": {
                "student": 100980,
                "general": 105980
              }
            }
          },
          {
            "id": "semi-medium-from-mt-5t-limited",
            "course": "準中型車限定解除",
            "transmission": "MT",
            "currentLicenseCodes": [
              "mt_5t_limited"
            ],
            "currentLicenseLabel": "MT5t限定",
            "skillHours": 4,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 69960,
                "general": 74960
              },
              "free": {
                "student": 75460,
                "general": 80460
              }
            }
          }
        ],
        "separateFees": [
          {
            "id": "provisional-license-exam",
            "label": "仮免試験手数料",
            "amount": 1800,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_attempt"
          },
          {
            "id": "provisional-license-issuance",
            "label": "仮免交付手数料",
            "amount": 1100,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_issuance"
          }
        ],
        "feeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 54500,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson",
            "label": "技能教習料",
            "amount": 6380,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "academic-stage-1",
            "label": "学科教習料1段階",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "academic-stage-2",
            "label": "学科教習料2段階",
            "amount": 37400,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "textbook",
            "label": "教科書代",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included",
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ]
          },
          {
            "id": "effect-measurement",
            "label": "効果測定料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "expressway",
            "label": "高速通行料",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "completion-exam",
            "label": "修了検定料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "moped-lesson",
            "label": "原付講習料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "otherFees": [
          {
            "id": "extension-lesson",
            "label": "延長・補習教習料",
            "amount": 6380,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "completion-reexam",
            "label": "修了検定再検定料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "provisional-retest",
            "label": "仮免試験再試験料",
            "amount": 1800,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_attempt"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "options": [
          {
            "id": "komikomi",
            "label": "コミコミプラン",
            "description": "延長・補習教習料・技能検定再検定料がかからないプランです",
            "pricesBySeason": {
              "aprToNov": 22000,
              "decToMar": 22000
            },
            "tax": "included"
          },
          {
            "id": "schedule",
            "label": "スケジュールプラン",
            "description": "お客様のご都合に合わせたスケジュール通りに教習を進めるプランです",
            "pricesBySeason": {
              "aprToNov": 55000,
              "decToMar": 77000
            },
            "tax": "included"
          }
        ],
        "licenseChangeFeeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 35140,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson",
            "label": "技能教習料",
            "amount": 6380,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "licenseChangeOtherFees": [
          {
            "id": "extension-lesson",
            "label": "延長・補習教習料",
            "amount": 6380,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6600,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "discounts": [
          {
            "id": "medical-qualification-academic-exemption",
            "label": "医師・看護師等の資格による学科教習免除",
            "amount": null,
            "benefit": {
              "academicHoursExempted": 3
            },
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ],
            "action": "窓口へ申し出"
          },
          {
            "id": "graduate-discount",
            "label": "卒業生割引",
            "amount": null,
            "amountStatus": "source_does_not_state_amount",
            "action": "窓口へ確認"
          }
        ],
        "notices": [
          "高速教習は原則、実車で行います。",
          "医師・看護師等の資格をお持ちの方は窓口へお申し出ください。学科教習が3時限免除になります。（免なし・原付持の方）",
          "当校を卒業された方は卒業生割引がございます。",
          "割引や特典の併用はできない場合がございます。",
          "途中退校（転校）の場合は当校規定により残金の精算をいたします。",
          "教習時間は時期等により変更になる場合がございます。",
          "予告なく教習料金を改定する場合がございます。"
        ]
      },
      "motorcycle": {
        "sourceId": "motorcycle",
        "label": "自動二輪車",
        "sourceOmissions": [
          "大型二輪ATの料金行は正式PDFに掲載されていません。",
          "自動二輪のオプションプラン料金表は正式PDFに掲載されていません。"
        ],
        "mainFeeRows": [
          {
            "id": "large-mt-from-ordinary-car",
            "course": "大型二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "ordinary_car"
            ],
            "currentLicenseLabel": "普通車",
            "skillHours": 31,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 206910,
                "general": 211910
              },
              "free": {
                "student": 228910,
                "general": 233910
              }
            }
          },
          {
            "id": "large-mt-from-at-small-motorcycle",
            "course": "大型二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_small_motorcycle"
            ],
            "currentLicenseLabel": "AT小型二輪車",
            "skillHours": 24,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 169290,
                "general": 174290
              },
              "free": {
                "student": 180290,
                "general": 185290
              }
            }
          },
          {
            "id": "large-mt-from-mt-small-motorcycle",
            "course": "大型二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "mt_small_motorcycle"
            ],
            "currentLicenseLabel": "MT小型二輪車",
            "skillHours": 20,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 149050,
                "general": 154050
              },
              "free": {
                "student": 160050,
                "general": 165050
              }
            }
          },
          {
            "id": "large-mt-from-at-standard-motorcycle",
            "course": "大型二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_standard_motorcycle"
            ],
            "currentLicenseLabel": "AT普通二輪車",
            "skillHours": 16,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 128810,
                "general": 133810
              },
              "free": {
                "student": 139810,
                "general": 144810
              }
            }
          },
          {
            "id": "large-mt-from-mt-standard-motorcycle",
            "course": "大型二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "mt_standard_motorcycle"
            ],
            "currentLicenseLabel": "MT普通二輪車",
            "skillHours": 12,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 108570,
                "general": 113570
              },
              "free": {
                "student": 119570,
                "general": 124570
              }
            }
          },
          {
            "id": "standard-motorcycle-mt-none-or-moped",
            "course": "普通二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "none",
              "moped"
            ],
            "currentLicenseLabel": "なし・原付",
            "skillHours": 19,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 181390,
                "general": 186390
              },
              "free": {
                "student": 192390,
                "general": 197390
              }
            }
          },
          {
            "id": "standard-motorcycle-mt-from-ordinary-car",
            "course": "普通二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "ordinary_car"
            ],
            "currentLicenseLabel": "普通車",
            "skillHours": 17,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 113520,
                "general": 118520
              },
              "free": {
                "student": 124520,
                "general": 129520
              }
            }
          },
          {
            "id": "standard-motorcycle-at-none-or-moped",
            "course": "普通二輪車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "none",
              "moped"
            ],
            "currentLicenseLabel": "なし・原付",
            "skillHours": 15,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 163350,
                "general": 168350
              },
              "free": {
                "student": 174350,
                "general": 179350
              }
            }
          },
          {
            "id": "standard-motorcycle-at-from-ordinary-car",
            "course": "普通二輪車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "ordinary_car"
            ],
            "currentLicenseLabel": "普通車",
            "skillHours": 13,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 95480,
                "general": 100480
              },
              "free": {
                "student": 106480,
                "general": 111480
              }
            }
          },
          {
            "id": "small-motorcycle-mt-none-or-moped",
            "course": "普通二輪車小型限定",
            "transmission": "MT",
            "currentLicenseCodes": [
              "none",
              "moped"
            ],
            "currentLicenseLabel": "なし・原付",
            "skillHours": 12,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 159720,
                "general": 164720
              },
              "free": {
                "student": 170720,
                "general": 175720
              }
            }
          },
          {
            "id": "small-motorcycle-mt-from-ordinary-car",
            "course": "普通二輪車小型限定",
            "transmission": "MT",
            "currentLicenseCodes": [
              "ordinary_car"
            ],
            "currentLicenseLabel": "普通車",
            "skillHours": 10,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 91850,
                "general": 96850
              },
              "free": {
                "student": 102850,
                "general": 107850
              }
            }
          },
          {
            "id": "small-motorcycle-at-none-or-moped",
            "course": "普通二輪車小型限定",
            "transmission": "AT",
            "currentLicenseCodes": [
              "none",
              "moped"
            ],
            "currentLicenseLabel": "なし・原付",
            "skillHours": 9,
            "academicHours": 26,
            "prices": {
              "day": {
                "student": 146190,
                "general": 151190
              },
              "free": {
                "student": 151690,
                "general": 156690
              }
            }
          },
          {
            "id": "small-motorcycle-at-from-ordinary-car",
            "course": "普通二輪車小型限定",
            "transmission": "AT",
            "currentLicenseCodes": [
              "ordinary_car"
            ],
            "currentLicenseLabel": "普通車",
            "skillHours": 8,
            "academicHours": 1,
            "prices": {
              "day": {
                "student": 82830,
                "general": 87830
              },
              "free": {
                "student": 88330,
                "general": 93330
              }
            }
          }
        ],
        "licenseChangeRows": [
          {
            "id": "standard-motorcycle-mt-from-at-small",
            "course": "普通二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_small_motorcycle"
            ],
            "currentLicenseLabel": "AT小型二輪車",
            "skillHours": 8,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 74030,
                "general": 79030
              },
              "free": {
                "student": 79530,
                "general": 84530
              }
            }
          },
          {
            "id": "standard-motorcycle-mt-from-mt-small",
            "course": "普通二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "mt_small_motorcycle"
            ],
            "currentLicenseLabel": "MT小型二輪車",
            "skillHours": 5,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 60500,
                "general": 65500
              },
              "free": {
                "student": 66000,
                "general": 71000
              }
            }
          },
          {
            "id": "standard-motorcycle-mt-from-at-standard",
            "course": "普通二輪車",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_standard_motorcycle"
            ],
            "currentLicenseLabel": "AT普通二輪車",
            "skillHours": 5,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 60500,
                "general": 65500
              },
              "free": {
                "student": 66000,
                "general": 71000
              }
            }
          },
          {
            "id": "standard-motorcycle-at-from-at-small",
            "course": "普通二輪車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "at_small_motorcycle"
            ],
            "currentLicenseLabel": "AT小型二輪車",
            "skillHours": 5,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 60500,
                "general": 65500
              },
              "free": {
                "student": 66000,
                "general": 71000
              }
            }
          },
          {
            "id": "standard-motorcycle-at-from-mt-small",
            "course": "普通二輪車",
            "transmission": "AT",
            "currentLicenseCodes": [
              "mt_small_motorcycle"
            ],
            "currentLicenseLabel": "MT小型二輪車",
            "skillHours": 3,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 51480,
                "general": 56480
              },
              "free": {
                "student": 56980,
                "general": 61980
              }
            }
          },
          {
            "id": "small-motorcycle-mt-from-at-small",
            "course": "小型限定",
            "transmission": "MT",
            "currentLicenseCodes": [
              "at_small_motorcycle"
            ],
            "currentLicenseLabel": "AT小型二輪車",
            "skillHours": 4,
            "academicHours": null,
            "prices": {
              "day": {
                "student": 55990,
                "general": 60990
              },
              "free": {
                "student": 61490,
                "general": 66490
              }
            }
          }
        ],
        "separateFees": [],
        "feeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 38000,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "large-skill-lesson",
            "label": "大型二輪車技能教習料",
            "amount": 5060,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "standard-skill-lesson",
            "label": "普通二輪車技能教習料",
            "amount": 4510,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "academic-stage-1",
            "label": "学科教習料1段階",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "academic-stage-2",
            "label": "学科教習料2段階",
            "amount": 35200,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "textbook-no-license-or-moped",
            "label": "教科書代",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included",
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ]
          },
          {
            "id": "textbook-license-holder",
            "label": "教科書代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included",
            "appliesToCurrentLicenses": [
              "license_holder"
            ]
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "effect-measurement",
            "label": "効果測定料",
            "amount": 1650,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 22000,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "otherFees": [
          {
            "id": "large-extension-lesson",
            "label": "大型二輪車延長・補習教習料",
            "amount": 5060,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "standard-extension-lesson",
            "label": "普通二輪車延長・補習教習料",
            "amount": 4510,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "options": [],
        "licenseChangeFeeBreakdown": [
          {
            "id": "enrollment",
            "label": "入学金",
            "amount": 29200,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson",
            "label": "技能教習料",
            "amount": 4510,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "aptitude-test",
            "label": "適性検査料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "graduation-exam",
            "label": "卒業検定料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "id-photo",
            "label": "証明写真代",
            "amount": 1100,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "certificate-issuance",
            "label": "証明書発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "free-plan",
            "label": "フリープラン料",
            "amount": 5500,
            "currency": "JPY",
            "tax": "included"
          }
        ],
        "licenseChangeOtherFees": [
          {
            "id": "extension-lesson",
            "label": "延長・補習教習料",
            "amount": 4510,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_period"
          },
          {
            "id": "graduation-reexam",
            "label": "卒業検定再検定料",
            "amount": 6050,
            "currency": "JPY",
            "tax": "included",
            "unit": "per_attempt"
          },
          {
            "id": "certificate-reissue",
            "label": "証明書再発行料",
            "amount": 3300,
            "currency": "JPY",
            "tax": "included"
          },
          {
            "id": "skill-lesson-no-show",
            "label": "技能教習無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          },
          {
            "id": "skill-test-no-show",
            "label": "技能検定無断キャンセル料",
            "amount": 5000,
            "currency": "JPY",
            "tax": "exempt",
            "unit": "per_occurrence"
          }
        ],
        "discounts": [
          {
            "id": "medical-qualification-academic-exemption",
            "label": "医師・看護師等の資格による学科教習免除",
            "amount": null,
            "benefit": {
              "academicHoursExempted": 3
            },
            "appliesToCurrentLicenses": [
              "none",
              "moped"
            ],
            "action": "窓口へ申し出"
          },
          {
            "id": "graduate-discount",
            "label": "卒業生割引",
            "amount": null,
            "amountStatus": "source_does_not_state_amount",
            "action": "窓口へ確認"
          }
        ],
        "notices": [
          "医師・看護師等の資格をお持ちの方は窓口へお申し出ください。学科教習が3時限免除になります。（免なし・原付持の方）",
          "当校を卒業された方は卒業生割引がございます。",
          "割引や特典の併用はできない場合がございます。",
          "途中退校（転校）の場合は当校規定により残金の精算をいたします。",
          "教習時間は時期等により変更になる場合がございます。",
          "予告なく教習料金を改定する場合がございます。"
        ]
      }
    }
  };
}());

if (typeof window !== "undefined") {
  window.CDS_PRICE_MASTER = CDS_PRICE_MASTER;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CDS_PRICE_MASTER;
}
