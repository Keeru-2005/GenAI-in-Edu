import matplotlib.pyplot as plt
import numpy as np

# Simulate volatile raw quiz scores
np.random.seed(42)
attempts = np.arange(1, 21)
# Raw scores: generally increasing but with sudden drops (distractions)
raw_scores = [0.4, 0.5, 0.45, 0.8, 0.3, 0.75, 0.85, 0.4, 0.9, 0.95, 0.5, 0.95, 0.98, 1.0, 0.6, 1.0, 1.0, 1.0, 0.8, 1.0]

# Calculate EMA
ema_scores = []
current_ema = 0
for score in raw_scores:
    current_ema = 0.7 * current_ema + 0.3 * score
    ema_scores.append(current_ema)

plt.figure(figsize=(8, 5))
plt.plot(attempts, raw_scores, marker='o', linestyle='--', color='salmon', alpha=0.7, label='Raw Quiz Score ($S_{quiz}$)')
plt.plot(attempts, ema_scores, marker='s', linestyle='-', color='dodgerblue', linewidth=2.5, label='EMA Mastery ($S_k$)')

plt.title('Stabilization of Concept Mastery via Exponential Moving Average (EMA)', fontsize=14, pad=15)
plt.xlabel('Quiz Attempts ($k$)', fontsize=12)
plt.ylabel('Mastery Score', fontsize=12)
plt.ylim(0, 1.1)
plt.xticks(np.arange(1, 21, step=1))
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='lower right', fontsize=11)

plt.tight_layout()
plt.savefig('figures/ema_mastery_trend.pdf', format='pdf', dpi=300)
plt.savefig('figures/ema_mastery_trend.png', format='png', dpi=300)
print("Saved EMA plots to figures/")
