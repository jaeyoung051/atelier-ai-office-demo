# SQLite 실제 적용 데이터 사전

## ai_employees

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| code | TEXT | True | — | False |
| name | TEXT | True | — | False |
| provider | TEXT | True | — | False |
| model | TEXT | True | 'unconfigured' | False |
| config_json | TEXT | True | '{}' | False |
| active | INTEGER | True | 1 | False |

## approvals

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| task_id | TEXT | True | — | False |
| result_version | INTEGER | True | — | False |
| result_snapshot | TEXT | True | — | False |
| decision | TEXT | True | — | False |
| reviewer | TEXT | True | — | False |
| comment | TEXT | True | '' | False |

## business_rules

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| rule_key | TEXT | True | — | False |
| category | TEXT | True | — | False |
| title | TEXT | True | — | False |
| body | TEXT | True | — | False |
| version | INTEGER | True | — | False |
| archived | INTEGER | True | 0 | False |

## media_files

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| storage_path | TEXT | True | — | False |
| original_name | TEXT | True | — | False |
| mime_type | TEXT | True | — | False |
| byte_size | INTEGER | True | — | False |
| sha256 | TEXT | False | — | False |
| metadata_json | TEXT | True | '{}' | False |

## portfolio_media

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| portfolio_id | TEXT | True | — | False |
| media_id | TEXT | True | — | False |
| sort_order | INTEGER | True | 0 | False |

## portfolios

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| project_id | TEXT | False | — | False |
| title | TEXT | True | — | False |
| summary | TEXT | True | '' | False |
| area_m2 | REAL | False | — | False |
| publication_consent | INTEGER | True | 0 | False |

## project_media

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| project_id | TEXT | True | — | False |
| media_id | TEXT | True | — | False |

## projects

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| name | TEXT | True | — | False |
| customer_alias | TEXT | False | — | False |
| site_summary | TEXT | False | — | False |
| status | TEXT | True | 'planning' | False |

## role_instructions

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| employee_id | TEXT | True | — | False |
| version | INTEGER | True | — | False |
| goal | TEXT | True | — | False |
| responsibilities | TEXT | True | — | False |
| inputs | TEXT | True | — | False |
| procedure | TEXT | True | — | False |
| outputs | TEXT | True | — | False |
| review | TEXT | True | — | False |
| cautions | TEXT | True | — | False |
| approval_conditions | TEXT | True | — | False |

## schema_migrations

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| version | TEXT | True | — | True |
| checksum | TEXT | True | — | False |
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |

## task_business_rules

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| task_id | TEXT | True | — | False |
| rule_id | TEXT | True | — | False |

## tasks

| 열 | 타입 | 필수 | 기본값 | PK |
|---|---|---|---|---|
| created_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| updated_at | TEXT | True | strftime('%Y-%m-%dT%H:%M:%fZ','now') | False |
| id | TEXT | True | — | True |
| project_id | TEXT | False | — | False |
| employee_id | TEXT | True | — | False |
| role_instruction_id | TEXT | False | — | False |
| title | TEXT | True | — | False |
| input_text | TEXT | True | '' | False |
| status | TEXT | True | 'pending' | False |
| result | TEXT | True | '' | False |
| result_version | INTEGER | True | 0 | False |

