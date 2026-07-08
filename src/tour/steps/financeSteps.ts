import type { TourStep } from './simulationSteps'

export const FINANCE_STEPS: TourStep[] = [
  {
    id: 'F1',
    page: 'finance',
    targetId: 'finance-page-header',
    title: 'Finance — marchés en temps réel',
    content: () =>
      `Cette page regroupe tout ce dont vous avez besoin pour suivre et analyser les marchés financiers : watchlist, graphiques avec indicateurs techniques, paper trading, backtest de stratégies et alertes prix.`,
  },
  {
    id: 'F2',
    page: 'finance',
    targetId: 'finance-tab-market',
    title: 'Onglet Marché',
    content: () =>
      `La watchlist affiche vos actifs favoris avec leurs cotations live Yahoo Finance (auto-refresh ou manuel). Variation journalière, cours actuel, ticker — cliquez sur un actif pour l'analyser en détail dans l'onglet suivant.`,
  },
  {
    id: 'F3',
    page: 'finance',
    targetId: 'finance-tab-analysis',
    title: 'Onglet Analyse',
    content: () =>
      `Graphique OHLCV (Open/High/Low/Close/Volume) avec superposition d'indicateurs techniques : SMA, EMA, RSI, MACD, Bandes de Bollinger, ATR, OBV. La prédiction à 30 jours utilise 3 modèles : régression linéaire, EMA momentum, et Monte-Carlo GBM.`,
  },
  {
    id: 'F4',
    page: 'finance',
    targetId: 'finance-tab-trading',
    title: 'Onglet Trading',
    content: () =>
      `Paper trading multi-comptes : créez des comptes virtuels avec du capital fictif, passez des ordres Market / Limit / Stop-Loss / Take-Profit. Toutes les positions et le P&L sont calculés en temps réel sans aucun argent réel impliqué.`,
  },
  {
    id: 'F5',
    page: 'finance',
    targetId: 'finance-tab-journal',
    title: 'Journal & backtest',
    content: () =>
      `Le Journal analyse vos trades fermés : win rate, profit factor, expectancy, max drawdown, Sharpe. Et depuis l'onglet Trading, testez 7 stratégies sur données historiques (DCA, SMA, RSI, Bollinger, MACD, Grid, manuel) avec comparaison Buy & Hold.`,
  },
  {
    id: 'F5b',
    page: 'finance',
    targetId: 'finance-tab-replay',
    title: 'Onglet Replay',
    content: () =>
      `Le Bar Replay rejoue l'historique d'un actif bougie par bougie depuis une date de votre choix. Passez des ordres sans connaître la suite, en pas-à-pas ou en lecture automatique — le meilleur entraînement avant de risquer du capital. La session est éphémère, rien n'est mélangé à vos comptes paper.`,
  },
  {
    id: 'F6',
    page: 'finance',
    targetId: 'finance-tab-screener',
    title: 'Onglet Screener',
    content: () =>
      `Filtrez les ~100 actifs disponibles (CAC40, S&P500, ETF, crypto, forex, matières premières) par classe d'actif, variation journalière %, RSI et ATR. Le signal de chaque actif est calculé en direct selon la stratégie active.`,
  },
  {
    id: 'F7',
    page: 'finance',
    targetId: 'finance-tab-alerts',
    title: 'Onglet Alertes prix',
    content: () =>
      `Configurez des alertes sur n'importe quel actif : prix au-dessus ou en-dessous d'un seuil, variation % intraday. Un badge rouge sur l'onglet vous notifie dès qu'une alerte est déclenchée — même si vous êtes sur une autre page.`,
  },
  {
    id: 'F8',
    page: 'finance',
    targetId: 'finance-tab-ai',
    title: 'Onglet IA',
    content: () =>
      `Chat financier propulsé par Claude Haiku. Le contexte de l'actif sélectionné, votre position ouverte et la valeur de votre compte sont injectés automatiquement dans le prompt système. Posez vos questions d'analyse sans quitter l'app.`,
  },
]
