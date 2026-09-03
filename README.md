# legal-docs — Documentos Jurídicos (Akoma Ntoso 3.0)

Repositório **fonte única** dos documentos jurídicos do **SaaS Auto Catálogo**: termos, privacidade, cookies, contrato SaaS e aviso LGPD.

- **Formato:** [Akoma Ntoso 3.0](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/os/part2-vocabulary/akn-02-vocabulary.html), tipo `doc`
- **Versionamento:** FRBR (Work / Expression / Manifestation)
- **Idioma:** português (BR), tom claro para lojista B2B
- **Spec de engenharia:** [legal-akn-specification.md](https://github.com/saas-auto-catalogo/.github/blob/main/docs/specs/legal-akn-specification.md)

## Estrutura de pastas

```
legal-docs/
├── README.md
├── manifest.json              # gerado pelo CI (não editar manualmente)
├── templates/                 # esqueletos AKN — copiar ao redigir nova versão
│   ├── termos-de-uso.xml
│   ├── politica-de-privacidade.xml
│   ├── politica-de-cookies.xml
│   ├── contrato-saas.xml
│   └── aviso-lgpd.xml
└── akn/
    └── {slug}/
        └── {YYYY-MM-DD}.xml   # versão publicada (data da Expression FRBR)
```

## Convenção FRBR

| Nível | Padrão URI | Exemplo |
|-------|------------|--------|
| **Work** | `/akn/br/doc/autocatalogo/{slug}` | `/akn/br/doc/autocatalogo/termos-de-uso` |
| **Expression** | `/akn/br/doc/autocatalogo/{slug}/{YYYY-MM-DD}` | `/akn/br/doc/autocatalogo/termos-de-uso/2026-09-02` |
| **Manifestation** | `.../{YYYY-MM-DD}/xml` | `/akn/br/doc/autocatalogo/termos-de-uso/2026-09-02/xml` |

### Slugs oficiais

| Slug | Documento | Uso no produto |
|------|-----------|----------------|
| `termos-de-uso` | Termos de Uso | Register, footer |
| `politica-de-privacidade` | Política de Privacidade (LGPD) | Register, footer |
| `politica-de-cookies` | Política de Cookies | Banner cookies, footer |
| `contrato-saas` | Contrato SaaS | Subscribe / checkout |
| `aviso-lgpd` | Aviso LGPD | Footer, página dedicada |

## Guia de escrita AKN

### 1. Iniciar nova versão

1. Copie o template de `templates/{slug}.xml` para `akn/{slug}/{YYYY-MM-DD}.xml` (data da publicação/revisão).
2. Atualize `FRBRExpression`, `FRBRManifestation` e `publication/@date` com a mesma data.
3. Substitua os headings e parágrafos placeholder pelo texto jurídico em português.

### 2. Estrutura mínima do XML

- Raiz: `<akomaNtoso>` com namespace AKN 3.0
- `<doc name="{slug}">` com `<meta>` (identification FRBR + publication) e `<mainBody>`
- Use `<hcontainer>` com `<heading>` para seções; `<p>` para parágrafos; `<list>` / `<item>` para listas

### 3. Seções obrigatórias por documento

Consulte a spec para o outline completo de cada slug:
[legal-akn-specification.md § 4](https://github.com/saas-auto-catalogo/.github/blob/main/docs/specs/legal-akn-specification.md)

| Documento | Seções mínimas |
|-----------|----------------|
| Termos de Uso | objeto, elegibilidade, conta, uso aceitável, PI, limitação, rescisão, foro |
| Privacidade | controlador/DPO, dados, bases legais, finalidades, compartilhamento, retenção, direitos, contato |
| Cookies | definição, tipos, tabela, gerenciamento, link privacidade |
| Contrato SaaS | planos, trial, Stripe, SLA, suporte, alteração termos, cancelamento |
| Aviso LGPD | direitos, exercício, prazo, DPO, ANPD |

### 4. Critérios antes do merge

- [ ] XML AKN 3.0 válido (`doc` + `meta` FRBR completo)
- [ ] Versão datada no path e em `FRBRExpression`
- [ ] Texto revisado internamente (comentário na issue de escrita)
- [ ] PR aprovado em `main`

## Fluxo de publicação

```
Issue [Escrita] → PR com akn/{slug}/{date}.xml → merge main
  → CI valida XSD + gera manifest.json
  → backend-api sincroniza manifest → marketing /legal/* + consent no app
```

## Labels do repositório

| Label | Uso |
|-------|-----|
| `escrita` | Redação de conteúdo jurídico em AKN |
| `task` | CI, manifest, integração técnica |
| `priority:high` | Bloqueia go-live ou register/subscribe |

## Épico pai

[.github#18 — Jurídico Akoma Ntoso](https://github.com/saas-auto-catalogo/.github/issues/18)

## Referências

- [RNFs e LGPD — non-functional-requirements-sla.md](https://github.com/saas-auto-catalogo/.github/blob/main/docs/specs/non-functional-requirements-sla.md)
- [OASIS LegalDocML Akoma Ntoso](https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=legaldocml)
