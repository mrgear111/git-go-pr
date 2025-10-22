// Client-side template rendering utilities
// This provides the same template structure as Astro components but for client-side rendering

export interface LeaderboardEntry {
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_prs: number;
  merged_prs: number;
}

export class LeaderboardRenderer {
  // Render the podium component
  static renderPodium(leaderboard: LeaderboardEntry[]): string {
    if (leaderboard.length < 3) {
      return `
        <div class="text-center py-16">
          <div class="inline-block animate-pulse rounded-full h-20 w-20 bg-gray-200 mb-4"></div>
          <h3 class="text-xl font-bold text-gray-900 mb-4 font-mono">Podium Coming Soon</h3>
          <p class="text-gray-600 font-mono">Top contributors will appear here once the competition heats up!</p>
        </div>
      `;
    }

    const [first, second, third] = leaderboard;
    
    return `
      <div class="flex justify-center items-end space-x-4 mb-12">
        ${second ? this.renderPodiumCard(second, 'second') : ''}
        ${first ? this.renderPodiumCard(first, 'first') : ''}
        ${third ? this.renderPodiumCard(third, 'third') : ''}
      </div>
    `;
  }

  private static renderPodiumCard(entry: LeaderboardEntry, position: 'first' | 'second' | 'third'): string {
    const configs = {
      first: { 
        height: 'h-56', 
        bg: 'bg-yellow-100', 
        border: 'border-4 border-yellow-400', 
        imgSize: 'w-20 h-20', 
        imgBorder: 'border-2 border-yellow-500', 
        textColor: 'text-yellow-700', 
        emoji: '👑', 
        emojiColor: 'text-yellow-600' 
      },
      second: { 
        height: 'h-44', 
        bg: 'bg-gray-100', 
        border: '', 
        imgSize: 'w-14 h-14', 
        imgBorder: '', 
        textColor: 'text-gray-700', 
        emoji: '🥈', 
        emojiColor: 'text-gray-500' 
      },
      third: { 
        height: 'h-44', 
        bg: 'bg-orange-100', 
        border: '', 
        imgSize: 'w-14 h-14', 
        imgBorder: '', 
        textColor: 'text-orange-700', 
        emoji: '🥉', 
        emojiColor: 'text-orange-500' 
      }
    };
    
    const config = configs[position];
    const displayName = this.escapeHtml(entry.display_name || entry.username);
    const username = this.escapeHtml(entry.username);
    
    return `
      <div class="${config.bg} rounded-lg p-6 w-40 ${config.height} flex flex-col items-center justify-between ${config.border}">
        <div class="text-center">
          <img 
            src="https://avatars.githubusercontent.com/${username}" 
            alt="${username}" 
            class="${config.imgSize} rounded-full mx-auto mb-2 ${config.imgBorder}"
          />
          <h3 class="font-bold text-base font-mono truncate max-w-full">${displayName}</h3>
          <p class="text-xs text-gray-600 font-mono truncate max-w-full">@${username}</p>
          <p class="text-xl font-bold ${config.textColor} font-mono mt-2">${entry.merged_prs} PRs</p>
          <p class="text-xs ${config.textColor.replace('700', '600')} font-mono">merged</p>
        </div>
        <div class="text-2xl font-bold ${config.emojiColor} font-mono">${config.emoji}</div>
      </div>
    `;
  }

  // Render the leaderboard table component
  static renderTable(leaderboard: LeaderboardEntry[]): string {
    return `
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="px-6 py-4 bg-green-600 text-white">
          <h2 class="text-xl font-semibold font-mono">Full Rankings</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Rank</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Contributor</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">GitHub</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Total PRs</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Merged PRs</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Badge</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${leaderboard.length === 0 ? this.renderEmptyTableRow() : leaderboard.map((entry, index) => this.renderTableRow(entry, index)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private static renderTableRow(entry: LeaderboardEntry, index: number): string {
    const badge = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    const rowClass = index < 3 ? 'bg-yellow-50' : '';
    const displayName = this.escapeHtml(entry.display_name || entry.username);
    const username = this.escapeHtml(entry.username);
    
    return `
      <tr class="${rowClass}">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">#${index + 1}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <img 
              src="https://avatars.githubusercontent.com/${username}" 
              alt="${username}" 
              class="w-8 h-8 rounded-full mr-3"
            />
            <span class="text-sm font-medium text-gray-900 font-mono">${displayName}</span>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
          <a 
            href="https://github.com/${username}" 
            target="_blank" 
            class="text-blue-600 hover:text-blue-800 underline"
          >
            @${username}
          </a>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">${entry.total_prs}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 font-mono">${entry.merged_prs}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <span class="text-2xl">${badge}</span>
        </td>
      </tr>
    `;
  }

  private static renderEmptyTableRow(): string {
    return `
      <tr>
        <td colspan="6" class="px-6 py-16 text-center">
          <h3 class="text-xl font-bold text-gray-900 mb-4 font-mono">Leaderboard Coming Soon</h3>
          <p class="text-gray-600 mb-8 max-w-md mx-auto font-mono">
            Once contributors start participating, you will see detailed rankings here.
          </p>
          <a 
            href="/login" 
            class="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold font-mono"
          >
            Sign in to Participate
          </a>
        </td>
      </tr>
    `;
  }

  // Utility function to escape HTML and prevent XSS
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Make it available globally for use in scripts
declare global {
  interface Window {
    LeaderboardRenderer: typeof LeaderboardRenderer;
  }
}

if (typeof window !== 'undefined') {
  window.LeaderboardRenderer = LeaderboardRenderer;
}