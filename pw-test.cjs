const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function setup(page) {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.getByText('Ajouter un profil').click();
  await page.waitForTimeout(600);
  await page.locator('input[type="text"]').fill('Veritest');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /Cr.er/ }).first().click();
  await page.waitForTimeout(1500);
  // dismiss onboarding
  const skipBtn = page.locator('button').filter({ hasText: /Passer|Skip|Fermer|Plus tard|Ignorer/i }).first();
  if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click();
  await page.waitForTimeout(500);
  // go to education
  await page.locator('.nav-item').filter({ hasText: 'Éducation' }).click();
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  
  await setup(page);
  
  // === TEST 1: Education page shows Fondamentaux ===
  const hasFonda = (await page.textContent('body'))?.includes('Fondamentaux');
  console.log('✅ Education page loads with Fondamentaux:', hasFonda);
  
  // Click on Fondamentaux module
  await page.locator('text=Les Fondamentaux').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t1-module-view.png' });
  
  const hasLessons = (await page.textContent('body'))?.includes("L'inflation et le pouvoir d'achat");
  console.log('✅ Module view shows lessons:', hasLessons);
  
  // === TEST 2: Leçon 1 - Inflation ===
  await page.locator('button:has-text("Commencer")').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t2-lecon1-content.png' });
  
  const hasInflation = (await page.textContent('body'))?.includes("L'inflation, l'ennemi silencieux");
  const hasSvg = await page.locator('svg.recharts-surface').first().isVisible().catch(() => false);
  const hasSlider = await page.locator('input[type="range"]').isVisible().catch(() => false);
  console.log('✅ Leçon 1 content loads:', hasInflation);
  console.log('✅ Recharts chart visible:', hasSvg);
  console.log('✅ Inflation slider visible:', hasSlider);
  
  // Move slider
  if (hasSlider) {
    await page.locator('input[type="range"]').fill('3');
    await page.waitForTimeout(200);
    console.log('✅ Slider moved to 3%');
  }
  
  // Go to QCM
  await page.locator('button:has-text("Passer au QCM")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t3-lecon1-quiz.png' });
  console.log('✅ Quiz screen for Leçon 1 loaded');
  
  // Answer correctly: Q1→B (1,5%), Q2→C (41k€), Q3→B (Inflation)
  await page.locator('button').filter({ hasText: "1,5 %" }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: "41 000 €" }).click();
  await page.waitForTimeout(100);
  // Q3: L'inflation (second occurrence of "L'inflation" - the option button, not a paragraph)
  const q3Buttons = page.locator('button').filter({ hasText: "L'inflation" });
  await q3Buttons.last().click();
  await page.waitForTimeout(100);
  
  await page.locator('button:has-text("Valider mes réponses")').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t4-lecon1-submitted.png' });
  
  const score1 = (await page.textContent('body'))?.includes('3/3');
  console.log('✅ Leçon 1 QCM score 3/3:', score1);
  
  // Proceed to result
  await page.locator('button:has-text("Voir le résultat")').click();
  await page.waitForTimeout(400);
  const result1 = (await page.textContent('body'))?.includes('Leçon 1 complétée');
  console.log('✅ Leçon 1 result screen:', result1);
  
  // Complete lesson
  await page.locator('button:has-text("Terminer la leçon")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t5-module-after-l1.png' });
  const l1done = (await page.textContent('body'))?.includes('✓ Fait');
  console.log('✅ Leçon 1 shows "Fait" in module view:', l1done);
  
  // === TEST 3: Leçon 2 - Compound interest ===
  await page.locator('button:has-text("Commencer")').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t6-lecon2-content.png' });
  
  const hasCompound = (await page.textContent('body'))?.includes('Les intérêts composés');
  const hasCapInput = await page.locator('input[type="number"]').isVisible().catch(() => false);
  console.log('✅ Leçon 2 content:', hasCompound, '| capital input:', hasCapInput);
  
  // Change capital
  if (hasCapInput) {
    await page.locator('input[type="number"]').fill('50000');
    await page.locator('input[type="number"]').blur();
    await page.waitForTimeout(300);
    console.log('✅ Capital changed to 50000');
  }
  
  await page.locator('button:has-text("Passer au QCM")').click();
  await page.waitForTimeout(400);
  
  // Q1→12 ans (correct: c), Q2→10k à 25 ans (correct: b), Q3→Les intérêts sont réinvestis (correct: b)
  await page.locator('button').filter({ hasText: '12 ans' }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: "10 000 € à 25 ans" }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: "Les intérêts sont réinvestis" }).click();
  await page.waitForTimeout(100);
  
  await page.locator('button:has-text("Valider mes réponses")').click();
  await page.waitForTimeout(400);
  const score2 = (await page.textContent('body'))?.includes('3/3');
  console.log('✅ Leçon 2 QCM 3/3:', score2);
  
  await page.locator('button:has-text("Voir le résultat")').click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Terminer la leçon")').click();
  await page.waitForTimeout(500);
  console.log('✅ Leçon 2 completed');
  
  // === TEST 4: Leçon 3 - Risk/Return ===
  await page.locator('button:has-text("Commencer")').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t7-lecon3-content.png' });
  
  const hasRisk = (await page.textContent('body'))?.includes('Risque, rendement et horizon');
  const hasScatter = await page.locator('svg.recharts-surface').first().isVisible().catch(() => false);
  console.log('✅ Leçon 3 content:', hasRisk, '| scatter chart:', hasScatter);
  
  await page.locator('button:has-text("Passer au QCM")').click();
  await page.waitForTimeout(400);
  
  // Q1→Livret A (c), Q2→L'excès de rendement (b), Q3→±15% autour de la moyenne (b), Q4→20 ans (c)
  await page.locator('button').filter({ hasText: 'Livret A' }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: "L'excès de rendement" }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: "±15" }).click();
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: '20 ans' }).click();
  await page.waitForTimeout(100);
  
  await page.locator('button:has-text("Valider mes réponses")').click();
  await page.waitForTimeout(400);
  const score3 = (await page.textContent('body'))?.includes('4/4');
  console.log('✅ Leçon 3 QCM 4/4:', score3);
  
  await page.locator('button:has-text("Voir le résultat")').click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Terminer la leçon")').click();
  await page.waitForTimeout(500);
  console.log('✅ Leçon 3 completed');
  
  // === TEST 5: Leçon 4 - Profile ===
  await page.locator('button:has-text("Commencer")').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t8-lecon4-content.png' });
  
  const hasProfile = (await page.textContent('body'))?.includes("Ton profil investisseur");
  console.log('✅ Leçon 4 content:', hasProfile);
  
  await page.locator('button:has-text("Passer au questionnaire")').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t9-lecon4-quiz.png' });
  
  // Answer all 5 questions - select option D (highest score) for Offensif profile
  const allOptions = await page.locator('button').filter({ hasText: /Plus de 15 ans|En rachètes|Plus de 40|Maximiser|Plus de 60/ }).all();
  for (const btn of allOptions) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(100);
  }
  
  // Check if all answered
  const voirBtn = page.locator('button:has-text("Voir mon profil")');
  const isEnabled = await voirBtn.isEnabled().catch(() => false);
  console.log('✅ "Voir mon profil" enabled:', isEnabled);
  
  await voirBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t10-lecon4-result.png' });
  
  const body = await page.textContent('body');
  const hasDonut = await page.locator('svg.recharts-surface').first().isVisible().catch(() => false);
  const profileShown = body?.includes('Offensif') || body?.includes('Dynamique') || body?.includes('Équilibré') || body?.includes('Prudent');
  console.log('✅ Profile result shown:', profileShown, '| Donut chart:', hasDonut);
  
  // Complete module
  await page.locator('button:has-text("Valider et terminer le Module 1")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t11-module-completed.png' });
  
  const bodyFinal = await page.textContent('body');
  const mod1done = bodyFinal?.includes('Module complété') || bodyFinal?.includes('complété');
  const exerciseDone = bodyFinal?.includes('✓ Validé');
  console.log('✅ Module 1 shows completed:', mod1done);
  console.log('✅ Exercise f-e1 marked Validé:', exerciseDone);
  
  // Go back to catalogue to check Module 2 unlocked
  await page.locator('button:has-text("Retour au catalogue")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/titou/AppData/Local/Temp/t12-catalogue-final.png' });
  
  const catBody = await page.textContent('body');
  const mod1completed = catBody?.includes('1 / 7') || catBody?.includes('complété');
  console.log('✅ Stats updated (modules completed):', mod1completed);
  
  // Check if Module 2 is no longer locked (opacity not 0.5)
  const mod2Card = page.locator('text=Allocation').first();
  const mod2Parent = mod2Card.locator('xpath=ancestor::div[contains(@class,"panel")]').first();
  const mod2Style = await mod2Parent.getAttribute('style').catch(() => '');
  console.log('Module 2 style (should not be opacity 0.5):', mod2Style);
  const mod2Unlocked = !mod2Style?.includes('opacity: 0.5') && !mod2Style?.includes('opacity:0.5');
  console.log('✅ Module 2 unlocked (not locked opacity):', mod2Unlocked);
  
  console.log('\n=== ALL TESTS COMPLETE ===');
  await browser.close();
})();
