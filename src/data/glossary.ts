export interface GlossaryTerm {
  id: string
  term: string
  shortDef: string        // 1 ligne, pour tooltip inline
  fullDef: string         // définition complète
  formula?: string        // formule si applicable
  example?: string        // exemple chiffré
  relatedTerms: string[]  // IDs des termes liés
  category: 'fiscal' | 'investissement' | 'enveloppe' | 'calcul' | 'risque'
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [

  // ── Fiscal ──────────────────────────────────────────────────────────────────

  {
    id: 'flat_tax',
    term: 'Flat tax (PFU)',
    shortDef: 'Taux forfaitaire unique de 30% sur les revenus du capital.',
    fullDef: "Le Prélèvement Forfaitaire Unique (PFU), ou flat tax, est un taux d'imposition de 30% appliqué sur les revenus et plus-values de capitaux mobiliers en France. Il se décompose en 12,8% d'impôt sur le revenu + 17,2% de prélèvements sociaux.",
    formula: 'PFU = 12,8% IR + 17,2% PS = 30%',
    example: 'Un gain de 10 000 € sur un CTO supporte une flat tax de 3 000 €, quel que soit le revenu global.',
    relatedTerms: ['tmi', 'ps', 'plus_value', 'bareme_progressif'],
    category: 'fiscal',
  },
  {
    id: 'pfu',
    term: 'PFU',
    shortDef: 'Synonyme de flat tax — Prélèvement Forfaitaire Unique à 30%.',
    fullDef: 'Voir flat tax. Le PFU est le régime fiscal par défaut sur les revenus de capitaux mobiliers depuis 2018.',
    relatedTerms: ['flat_tax'],
    category: 'fiscal',
  },
  {
    id: 'tmi',
    term: 'TMI',
    shortDef: 'Tranche Marginale d\'Imposition — le taux qui s\'applique à votre dernier euro de revenu.',
    fullDef: "La TMI est le taux d'imposition de la tranche de revenu la plus haute atteinte par le foyer fiscal. En France : 0%, 11%, 30%, 41% ou 45%. Elle ne s'applique qu'à la fraction de revenu dépassant chaque seuil, pas à la totalité du revenu.",
    example: 'Avec 45 000 €/an de revenus imposables, la TMI est 30%. Seule la fraction au-dessus de 27 478 € est taxée à 30%.',
    relatedTerms: ['flat_tax', 'bareme_progressif', 'per'],
    category: 'fiscal',
  },
  {
    id: 'ps',
    term: 'Prélèvements sociaux (PS)',
    shortDef: '17,2% prélevés sur les revenus du patrimoine (dividendes, plus-values, intérêts).',
    fullDef: "Les prélèvements sociaux s'élèvent à 17,2% depuis 2018 (CSG 9,2% + CRDS 0,5% + prélèvement de solidarité 7,5%). Ils s'appliquent sur tous les revenus du patrimoine, y compris ceux exonérés d'IR comme le PEA après 5 ans.",
    formula: 'PS = 17,2% (CSG 9,2% + CRDS 0,5% + Prélèvement solidarité 7,5%)',
    relatedTerms: ['flat_tax', 'pea', 'plus_value'],
    category: 'fiscal',
  },
  {
    id: 'abattement',
    term: 'Abattement fiscal',
    shortDef: 'Réduction de la base imposable, applicable à certains revenus ou plus-values.',
    fullDef: "Un abattement réduit la somme sur laquelle est calculé l'impôt. Exemples : abattement de 4 600 €/an (ou 9 200 € pour un couple) sur les gains de l'assurance-vie après 8 ans ; abattement de 40% sur les dividendes d'actions françaises en régime barème.",
    example: 'AV de 8 ans, gain de 10 000 €, TMI 30% : base imposable = 10 000 - 4 600 = 5 400 €. Impôt = 5 400 × (30% + 17,2%) = 2 549 €.',
    relatedTerms: ['assurance_vie', 'dividende', 'tmi'],
    category: 'fiscal',
  },
  {
    id: 'plus_value',
    term: 'Plus-value',
    shortDef: 'Gain réalisé lors de la cession d\'un actif (valeur de vente - prix d\'achat).',
    fullDef: "La plus-value est la différence positive entre le prix de vente et le prix d'achat d'un actif. En France, les plus-values mobilières (actions, ETF, etc.) sont soumises au PFU de 30% par défaut ou au barème progressif sur option.",
    formula: 'Plus-value = Prix de vente - Prix de revient',
    example: 'Achat de parts d\'ETF à 10 000 €, revendues à 15 000 € → plus-value de 5 000 €, imposée à 1 500 € au taux flat tax.',
    relatedTerms: ['flat_tax', 'pea', 'cto'],
    category: 'fiscal',
  },
  {
    id: 'dividende',
    term: 'Dividende',
    shortDef: 'Part des bénéfices d\'une entreprise distribuée aux actionnaires.',
    fullDef: "Les dividendes sont une distribution de bénéfices aux actionnaires. Fiscalement en France, ils subissent le PFU 30% par défaut. Sur option barème (si TMI ≤ 11%), un abattement de 40% s'applique avant imposition. Sur un CTO, ils représentent un flux de trésorerie sortant du portefeuille.",
    relatedTerms: ['flat_tax', 'abattement', 'cto'],
    category: 'fiscal',
  },
  {
    id: 'bareme_progressif',
    term: 'Barème progressif',
    shortDef: 'Option d\'imposition des revenus du capital au barème IR (avantageux si TMI ≤ 11%).',
    fullDef: "Sur option, les revenus de capitaux mobiliers peuvent être imposés au barème progressif de l'IR plutôt qu'à la flat tax. Cette option est globale (tous les revenus mobiliers) et avantageuse uniquement si la TMI est inférieure ou égale à 11%. Avec un abattement de 40% sur les dividendes d'actions françaises.",
    relatedTerms: ['tmi', 'flat_tax', 'dividende'],
    category: 'fiscal',
  },
  {
    id: 'exoneration',
    term: 'Exonération fiscale',
    shortDef: 'Dispense totale d\'impôt sur un revenu ou gain. Ex : Livret A, PEA après 5 ans (IR).',
    fullDef: "L'exonération signifie qu'aucun impôt sur le revenu n'est dû. Les livrets réglementés (Livret A, LDDS, LEP) sont entièrement exonérés. Le PEA après 5 ans est exonéré d'IR mais reste soumis aux PS (17,2%). L'assurance-vie bénéficie d'un régime favorable après 8 ans.",
    relatedTerms: ['livret_a', 'pea', 'ps'],
    category: 'fiscal',
  },
  {
    id: 'fiscalite_sortie',
    term: 'Fiscalité à la sortie',
    shortDef: 'Impôt calculé et prélevé lors du retrait ou de la clôture d\'une enveloppe.',
    fullDef: "Contrairement à l'imposition annuelle, certaines enveloppes (PEA, AV, PER) ne sont taxées qu'à la sortie (rachat ou clôture). Cela permet une capitalisation des gains sans frottement fiscal annuel — l'impôt n'est dû que sur les gains au moment du retrait.",
    relatedTerms: ['pea', 'assurance_vie', 'per', 'plus_value'],
    category: 'fiscal',
  },

  // ── Investissement ───────────────────────────────────────────────────────────

  {
    id: 'interets_composes',
    term: 'Intérêts composés',
    shortDef: 'Les intérêts génèrent eux-mêmes des intérêts — le capital croît de façon exponentielle.',
    fullDef: "Les intérêts composés se produisent quand les gains d'une période sont réinvestis et produisent eux-mêmes des rendements les périodes suivantes. C'est le mécanisme fondamental de la croissance du patrimoine sur le long terme.",
    formula: 'C_n = C_0 × (1 + r)^n',
    example: '10 000 € à 7%/an → 19 672 € en 10 ans, 38 697 € en 20 ans.',
    relatedTerms: ['rendement', 'rendement_reel', 'duration'],
    category: 'investissement',
  },
  {
    id: 'rendement',
    term: 'Rendement (nominal)',
    shortDef: 'Taux de croissance annuel d\'un investissement avant correction de l\'inflation.',
    fullDef: "Le rendement nominal est le taux de croissance brut d'un investissement, sans tenir compte de l'inflation. Un rendement de 7% sur un ETF signifie que le capital croît de 7% par an en valeur courante.",
    formula: 'r_nominal = (V_finale - V_initiale) / V_initiale',
    relatedTerms: ['rendement_reel', 'inflation', 'fisher'],
    category: 'investissement',
  },
  {
    id: 'rendement_reel',
    term: 'Rendement réel',
    shortDef: 'Rendement corrigé de l\'inflation via la formule de Fisher.',
    fullDef: "Le rendement réel mesure la croissance du pouvoir d'achat d'un investissement, en soustrayant l'effet de l'inflation. On utilise la formule exacte de Fisher : (1+r_nominal)/(1+inflation) - 1.",
    formula: 'r_réel = (1 + r_nominal) / (1 + inflation) - 1',
    example: 'Rendement nominal 7%, inflation 2,5% → rendement réel = (1,07/1,025) - 1 ≈ 4,39%.',
    relatedTerms: ['rendement', 'inflation', 'fisher'],
    category: 'investissement',
  },
  {
    id: 'inflation',
    term: 'Inflation',
    shortDef: 'Hausse générale des prix qui érode le pouvoir d\'achat de la monnaie.',
    fullDef: "L'inflation est la hausse générale et durable du niveau des prix. Elle érode le pouvoir d'achat : 1 000 € aujourd'hui valent moins dans 20 ans. En France, l'inflation historique moyenne est ~2%/an (cible BCE). La simulation utilise la formule de Fisher pour calculer la valeur réelle.",
    relatedTerms: ['rendement_reel', 'fisher', 'valeur_actuelle'],
    category: 'investissement',
  },
  {
    id: 'fisher',
    term: 'Formule de Fisher',
    shortDef: 'Relation exacte entre taux nominal, réel et inflation : (1+rn) = (1+rr)(1+i).',
    fullDef: "La formule de Fisher exprime la relation exacte entre le taux d'intérêt nominal (r_n), le taux réel (r_r) et l'inflation (i). L'approximation courante r_réel ≈ r_nominal - inflation est une simplification valable à faibles taux.",
    formula: '(1 + r_n) = (1 + r_r) × (1 + i)\nr_r = (1 + r_n)/(1 + i) - 1',
    example: 'r_nominal = 7%, inflation = 3% → r_réel = 1,07/1,03 - 1 = 3,88% (et non 4%).',
    relatedTerms: ['rendement_reel', 'inflation'],
    category: 'investissement',
  },
  {
    id: 'etf',
    term: 'ETF',
    shortDef: 'Fonds indiciel coté en bourse répliquant un indice (MSCI World, S&P 500…).',
    fullDef: "Un ETF (Exchange-Traded Fund) est un fonds d'investissement coté en bourse qui reproduit la performance d'un indice de référence. Avantages : faibles frais de gestion (0,1–0,5%/an), diversification instantanée, liquidité. Idéal pour investir en PEA ou CTO.",
    relatedTerms: ['scpi', 'diversification', 'pea', 'cto'],
    category: 'investissement',
  },
  {
    id: 'scpi',
    term: 'SCPI',
    shortDef: 'Société Civile de Placement Immobilier — investissement immobilier mutualisé.',
    fullDef: "Les SCPI permettent d'investir dans l'immobilier collectivement, sans gérer un bien directement. Les revenus locatifs (rendement ~4-6%/an) sont distribués proportionnellement. Peuvent être logées dans une assurance-vie.",
    relatedTerms: ['etf', 'assurance_vie', 'rendement'],
    category: 'investissement',
  },
  {
    id: 'diversification',
    term: 'Diversification',
    shortDef: 'Répartir les investissements sur plusieurs actifs pour réduire le risque global.',
    fullDef: "La diversification consiste à répartir les investissements entre différentes classes d'actifs, zones géographiques, secteurs, ou enveloppes fiscales. Elle réduit le risque spécifique sans forcément réduire le rendement attendu (théorème de Markowitz).",
    relatedTerms: ['correlation', 'risque_liquidite', 'sharpe'],
    category: 'investissement',
  },

  // ── Enveloppes ───────────────────────────────────────────────────────────────

  {
    id: 'pea',
    term: 'PEA',
    shortDef: 'Plan d\'Épargne en Actions — enveloppe fiscale optimale pour actions/ETF (PS 17,2% après 5 ans).',
    fullDef: "Le Plan d'Épargne en Actions permet d'investir en actions et ETF européens avec une fiscalité avantageuse. Plafond de versement : 150 000 €. Après 5 ans, seuls les prélèvements sociaux (17,2%) s'appliquent sur les gains. Pas d'impôt sur le revenu.",
    relatedTerms: ['pea_pme', 'cto', 'fiscalite_sortie', 'ps'],
    category: 'enveloppe',
  },
  {
    id: 'cto',
    term: 'CTO',
    shortDef: 'Compte-Titres Ordinaire — flexible, sans plafond, fiscalité flat tax 30%.',
    fullDef: "Le Compte-Titres Ordinaire est l'enveloppe la plus flexible : pas de plafond de versement, accès à toutes les classes d'actifs mondiales. En contrepartie, les plus-values et dividendes sont imposés chaque année (flat tax 30% ou barème progressif).",
    relatedTerms: ['pea', 'plus_value', 'dividende', 'flat_tax'],
    category: 'enveloppe',
  },
  {
    id: 'assurance_vie',
    term: 'Assurance-vie',
    shortDef: 'Enveloppe multi-supports avec fiscalité allégée après 8 ans (abattement 4 600 €).',
    fullDef: "L'assurance-vie est une enveloppe polyvalente permettant d'investir en fonds euros (capital garanti) ou unités de compte (actions, ETF, SCPI). Fiscalité favorable après 8 ans : taux réduit 24,7% + abattement annuel de 4 600 € (9 200 € pour un couple) sur les gains.",
    relatedTerms: ['fiscalite_sortie', 'abattement', 'per'],
    category: 'enveloppe',
  },
  {
    id: 'per',
    term: 'PER',
    shortDef: 'Plan d\'Épargne Retraite — déduction fiscale à l\'entrée, imposition à la sortie à la TMI.',
    fullDef: "Le Plan d'Épargne Retraite permet de déduire les versements du revenu imposable (dans la limite de 10% des revenus). À la sortie en capital, les versements sont imposés à la TMI + les gains à la flat tax 30%. Très avantageux pour les TMI élevées.",
    relatedTerms: ['tmi', 'assurance_vie', 'fiscalite_sortie'],
    category: 'enveloppe',
  },
  {
    id: 'livret_a',
    term: 'Livret A',
    shortDef: 'Livret réglementé à 3% net, plafond 22 950 €, totalement exonéré d\'impôts.',
    fullDef: "Le Livret A est le livret d'épargne réglementé le plus connu en France. Taux fixé par l'État (actuellement 3%), totalement exonéré d'IR et de PS. Plafond de 22 950 €. Idéal pour l'épargne de précaution (disponibilité immédiate).",
    relatedTerms: ['ldds', 'lep', 'exoneration'],
    category: 'enveloppe',
  },
  {
    id: 'ldds',
    term: 'LDDS',
    shortDef: 'Livret de Développement Durable et Solidaire — 3% exonéré, plafond 12 000 €.',
    fullDef: "Le LDDS est un livret réglementé complémentaire au Livret A, avec les mêmes conditions de rémunération (3% actuellement) et d'exonération fiscale totale. Plafond de 12 000 €. Complémentaire naturel du Livret A une fois celui-ci plein.",
    relatedTerms: ['livret_a', 'lep', 'exoneration'],
    category: 'enveloppe',
  },
  {
    id: 'lep',
    term: 'LEP',
    shortDef: 'Livret d\'Épargne Populaire — 4% exonéré, réservé aux revenus modestes, plafond 10 000 €.',
    fullDef: "Le Livret d'Épargne Populaire est réservé aux foyers dont le revenu fiscal de référence est inférieur à un plafond (environ 22 000 € pour une personne seule). Il offre le meilleur taux des livrets réglementés (4%) et est totalement exonéré.",
    relatedTerms: ['livret_a', 'ldds', 'exoneration'],
    category: 'enveloppe',
  },
  {
    id: 'plafond_versement',
    term: 'Plafond de versement',
    shortDef: 'Limite légale des versements cumulés dans une enveloppe fiscale.',
    fullDef: "Certaines enveloppes fiscalement avantageuses sont plafonnées en versements cumulés : Livret A (22 950 €), LDDS (12 000 €), PEA (150 000 €). Le dépassement est interdit. Les gains peuvent continuer à croître au-delà du plafond sans versements supplémentaires.",
    relatedTerms: ['pea', 'livret_a', 'ldds'],
    category: 'enveloppe',
  },

  // ── Calcul ───────────────────────────────────────────────────────────────────

  {
    id: 'van',
    term: 'VAN (Valeur Actuelle Nette)',
    shortDef: 'Valeur présente d\'un flux futur actualisé par un taux d\'actualisation.',
    fullDef: "La VAN est la valeur d'un flux financier futur ramenée au présent en appliquant un taux d'actualisation. Elle permet de comparer des sommes à des dates différentes sur une base commune (la monnaie d'aujourd'hui).",
    formula: 'VAN = Σ [CF_t / (1+r)^t]',
    example: 'Recevoir 1 000 € dans 10 ans avec un taux d\'actualisation de 5% vaut aujourd\'hui : 1 000 / 1,05^10 = 613,91 €.',
    relatedTerms: ['valeur_actuelle', 'tri', 'inflation'],
    category: 'calcul',
  },
  {
    id: 'valeur_actuelle',
    term: 'Valeur actuelle',
    shortDef: 'Capital futur actualisé par l\'inflation pour exprimer son équivalent en euros d\'aujourd\'hui.',
    fullDef: "Dans le contexte de la simulation patrimoniale, la valeur actuelle (ou valeur réelle) est le capital futur divisé par (1+inflation)^n. Elle représente le pouvoir d'achat réel du capital simulé, exprimé en euros constants d'aujourd'hui.",
    formula: 'VA = V_future / (1 + inflation)^n',
    relatedTerms: ['inflation', 'fisher', 'rendement_reel'],
    category: 'calcul',
  },
  {
    id: 'tri',
    term: 'TRI (Taux de Rendement Interne)',
    shortDef: 'Taux d\'actualisation qui annule la VAN — mesure la rentabilité réelle d\'un investissement.',
    fullDef: "Le TRI est le taux d'actualisation pour lequel la valeur actuelle nette des flux (entrées - sorties) est nulle. Il exprime le rendement annualisé réel d'un investissement, tenant compte de la temporalité des flux de trésorerie.",
    relatedTerms: ['van', 'rendement'],
    category: 'calcul',
  },
  {
    id: 'regle_4_pourcent',
    term: 'Règle des 4%',
    shortDef: 'Règle empirique : retirer 4% du capital/an permet une retraite durable (~30 ans).',
    fullDef: "Règle empirique issue de l'étude de Trinity (1998) : retirer 4% du capital initial chaque année (indexé inflation) donne ~96% de chances que le portefeuille survive 30 ans. Pour 3 000 €/mois de retrait, il faut un capital de 3 000 × 12 / 0,04 = 900 000 €.",
    formula: 'Capital nécessaire = Retrait annuel / 0,04',
    example: 'Retrait cible : 2 000 €/mois → capital nécessaire = 24 000 / 4% = 600 000 €.',
    relatedTerms: ['taux_retrait', 'sequence_risk'],
    category: 'calcul',
  },
  {
    id: 'taux_retrait',
    term: 'Taux de retrait',
    shortDef: 'Pourcentage du capital retiré annuellement à la retraite (en général 3,5–5%).',
    fullDef: "Le taux de retrait est le pourcentage du capital retiré chaque année à la retraite pour financer les dépenses. Un taux de 4% (règle des 4%) est considéré comme prudent sur 30 ans. Un taux plus élevé accroît le risque d'épuisement du capital.",
    relatedTerms: ['regle_4_pourcent', 'sequence_risk'],
    category: 'calcul',
  },

  // ── Risque ───────────────────────────────────────────────────────────────────

  {
    id: 'volatilite',
    term: 'Volatilité',
    shortDef: 'Mesure de l\'amplitude des variations de prix d\'un actif (écart-type des rendements).',
    fullDef: "La volatilité est l'écart-type des rendements d'un actif sur une période donnée. Un actif très volatil (actions) peut varier fortement à court terme mais tend à offrir des rendements supérieurs sur le long terme. Les obligations sont moins volatiles.",
    relatedTerms: ['sharpe', 'drawdown', 'diversification'],
    category: 'risque',
  },
  {
    id: 'sharpe',
    term: 'Ratio de Sharpe',
    shortDef: 'Rendement excédentaire d\'un portefeuille divisé par sa volatilité.',
    fullDef: "Le ratio de Sharpe mesure la performance ajustée du risque d'un portefeuille. Un ratio élevé indique un bon rendement pour le niveau de risque pris. Formule : (rendement du portefeuille - taux sans risque) / volatilité.",
    formula: 'Sharpe = (R_p - R_f) / σ_p',
    relatedTerms: ['volatilite', 'diversification'],
    category: 'risque',
  },
  {
    id: 'drawdown',
    term: 'Drawdown',
    shortDef: 'Perte maximale entre un pic et le creux suivant d\'un portefeuille.',
    fullDef: "Le drawdown mesure la perte maximale subie depuis le plus haut point d'un portefeuille jusqu'au point le plus bas suivant. Exprimé en pourcentage. Un drawdown de 50% signifie que le capital a été divisé par deux à un moment donné.",
    example: 'Le S&P 500 a eu un drawdown de -56% pendant la crise de 2008-2009.',
    relatedTerms: ['volatilite', 'sequence_risk'],
    category: 'risque',
  },
  {
    id: 'risque_liquidite',
    term: 'Risque de liquidité',
    shortDef: 'Risque de ne pas pouvoir vendre rapidement un actif à un prix raisonnable.',
    fullDef: "Le risque de liquidité est la difficulté à convertir un actif en cash rapidement sans subir une perte importante. Les ETF cotés sont très liquides (achat/vente en temps réel). Les SCPI, l'immobilier direct ou le PER présentent un risque de liquidité élevé.",
    relatedTerms: ['diversification', 'pea', 'scpi'],
    category: 'risque',
  },
  {
    id: 'correlation',
    term: 'Corrélation',
    shortDef: 'Mesure de la relation entre les variations de deux actifs (entre -1 et +1).',
    fullDef: "La corrélation mesure le degré de relation linéaire entre deux séries de rendements. Une corrélation de +1 signifie que les deux actifs évoluent toujours dans le même sens, -1 dans le sens opposé, 0 indépendamment. Diversifier dans des actifs peu corrélés réduit le risque global.",
    relatedTerms: ['diversification', 'volatilite', 'sharpe'],
    category: 'risque',
  },
  {
    id: 'sequence_risk',
    term: 'Sequence of Returns Risk',
    shortDef: 'Risque que de mauvaises performances en début de retraite épuisent le capital prématurément.',
    fullDef: "Le sequence of returns risk (risque de séquence) décrit l'impact négatif de rendements défavorables en début de phase de retrait. Deux investisseurs avec le même rendement moyen peuvent avoir des résultats très différents selon l'ordre des rendements annuels.",
    relatedTerms: ['regle_4_pourcent', 'taux_retrait', 'drawdown'],
    category: 'risque',
  },
]

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY_TERMS.map((t) => [t.id, t]))

export const GLOSSARY_CATEGORIES = ['fiscal', 'investissement', 'enveloppe', 'calcul', 'risque'] as const
