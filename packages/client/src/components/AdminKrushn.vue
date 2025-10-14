<template>
  <main class="container">
    <h3>Krushn's Hacktoberfest Tracker</h3>

    <div class="card">
      <div class="card-content">
        <span class="card-title">Statistics</span>

        <table v-if="statistics" class="stats-table">
          <tbody>
            <tr>
              <td>Total PRs</td>
              <td>{{ displayStatistics.totalPRs }}</td>
            </tr>
            <tr>
              <td>Merged PRs</td>
              <td>{{ displayStatistics.mergedPRs }}</td>
            </tr>
            <tr>
              <td>Open PRs</td>
              <td>{{ displayStatistics.openPRs }}</td>
            </tr>
            <tr>
              <td>Closed PRs</td>
              <td>{{ displayStatistics.closedPRs }}</td>
            </tr>
            <tr v-if="!selectedUser">
              <td>Total Repositories</td>
              <td>{{ statistics.totalRepositories }}</td>
            </tr>
            <tr v-if="!selectedUser">
              <td>Red-Flagged Repositories</td>
              <td>{{ statistics.redFlaggedRepositories }}</td>
            </tr>
            <tr v-if="!selectedUser">
              <td>Total Users</td>
              <td>{{ statistics.totalUsers }}</td>
            </tr>
            <tr v-if="!selectedUser">
              <td>Total Colleges</td>
              <td>{{ statistics.totalColleges }}</td>
            </tr>
            <tr v-if="!selectedUser">
              <td>Total Owners</td>
              <td>{{ statistics.totalOwners }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-content">
        <span class="card-title">Search</span>

        <div class="row">
          <div class="input-field col s3">
            <select v-model="selectedCollege" @change="filterByCollege">
              <option value="">All Colleges</option>
              <option
                v-for="college in colleges"
                :key="college._id"
                :value="college._id">
                {{ college.name }}
              </option>
            </select>
            <label>Filter by College</label>
          </div>

          <div class="input-field col s3">
            <select v-model="selectedOwner" @change="filterByOwner">
              <option value="">All Owners</option>
              <option v-for="owner in owners" :key="owner" :value="owner">
                {{ owner }}
              </option>
            </select>
            <label>Filter by Owner</label>
          </div>

          <div class="input-field col s3">
            <select v-model="selectedRepository" @change="filterByRepository">
              <option value="">All Repositories</option>
              <option v-for="repo in repositories" :key="repo" :value="repo">
                {{ repo }} ({{ repo }})
              </option>
            </select>
            <label>Filter by Repository</label>
          </div>

          <div class="input-field col s3">
            <select v-model="selectedUser" @change="filterByUser">
              <option value="">All Users</option>
              <option v-for="user in users" :key="user" :value="user">
                {{ user }} (@{{ user }})
              </option>
            </select>
            <label>Filter by User</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Profile Section -->
    <div class="search-container">
      <h4>Search Profile by Author</h4>
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          @input="handleSearchInput"
          @focus="showSearchResults = true"
          placeholder="Search by username or full name..." />

        <div
          v-if="showSearchResults && searchResults.length > 0"
          class="search-results">
          <div
            v-for="user in searchResults"
            :key="user._id"
            @click="selectUser(user)"
            class="search-result-item">
            <div>
              <strong>{{ user.full_name }}</strong> (@{{ user.username }})
            </div>
            <div class="user-info">
              {{ user.college?.name || 'No College' }} -
              {{ user.year || 'N/A' }} | {{ user.role }}
            </div>
          </div>
        </div>

        <div
          v-if="showSearchResults && searchQuery && searchResults.length === 0"
          class="search-results">
          <div class="search-result-item">No users found</div>
        </div>
      </div>

      <div v-if="selectedUser" class="selected-user">
        <strong>Selected Profile:</strong> {{ selectedUser.full_name }} (@{{
          selectedUser.username
        }})
        <button @click="clearSelection" class="clear-button">
          Clear Filter
        </button>
        <div v-if="userProfileStats" style="margin-top: 10px">
          <strong>Stats:</strong>
          Total PRs: {{ userProfileStats.totalPRs }} | Merged:
          {{ userProfileStats.mergedPRs }} | Open:
          {{ userProfileStats.openPRs }} | Closed:
          {{ userProfileStats.closedPRs }}
        </div>
      </div>
    </div>

    <h4>
      Pull Requests {{ selectedUser ? 'for ' + selectedUser.full_name : '' }}
    </h4>
    <table v-if="displayedPRs.length">
      <thead>
        <tr>
          <td v-if="statistics" colspan="6">
            Visible PRs: {{ displayedPRs.length }}
            <span v-if="!selectedUser">
              | Hidden PRs:
              {{ statistics.totalPRs - displayedPRs.length }}</span
            >
          </td>
        </tr>
        <tr>
          <th>Author</th>
          <th>Owner</th>
          <th>Repository</th>
          <th>Status</th>
          <th>Title</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pr in displayedPRs" :key="pr._id">
          <td>
            <p>{{ pr.author.full_name }}</p>
            <p>{{ pr.author.username }}</p>
            <p>{{ pr.author.college?.name }} - {{ pr.author.college?.year }}</p>
            <p>{{ pr.author.role }}</p>
          </td>

          <td>{{ pr.repository.owner.username }}</td>

          <td>
            {{ pr.repository.name }} Is Self Repo?
            {{
              pr.repository.owner.username === pr.author.username ? 'Yes' : 'No'
            }}

            <button @click="redFlagRepository(pr.repository._id)">
              Mark Red Flag
            </button>
          </td>

          <td>
            <span v-if="pr.is_merged">Merged</span>
            <span v-else-if="pr.is_open">Open</span>
            <span v-else>Closed</span>
          </td>

          <td>{{ pr.title }}</td>

          <td><a :href="pr.link" target="_blank">View PR</a></td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<script>
import { ref, computed } from 'vue'

const API_BASE = 'http://localhost:4000'
let adminPassword = 'backtest'

export default {
  setup() {
    const users = ref([])
    const colleges = ref([])
    const owners = ref([])
    const repositories = ref([])
    const prs = ref([])

    const statistics = ref(null)

    // Search-related state
    const selectedUser = ref('')
    const selectedCollege = ref('')
    const selectedOwner = ref('')
    const selectedRepository = ref('')

    const searchQuery = ref('')
    const searchResults = ref([])
    const showSearchResults = ref(false)

    const userProfileStats = ref(null)

    let searchTimeout = null

    function fetchData() {
      fetch(
        `${API_BASE}/api/admin/pull-requests?adminPassword=${adminPassword}`
      )
        .then((response) => response.json())
        .then((data) => {
          // console.log('Fetched PRs:', data)
          prs.value = data

          const usersSet = new Set()
          const collegesSet = new Set()
          const ownersSet = new Set()
          const repositoriesSet = new Set()

          data.prs.forEach((pr) => {
            if (pr.author) {
              usersSet.add(pr.author.username)
            }
            if (pr.author.college) {
              collegesSet.add(pr.author.college.name)
            }
            if (pr.repository && pr.repository.owner) {
              ownersSet.add(pr.repository.owner.username)
            }
            if (pr.repository && pr.repository.name) {
              repositoriesSet.add(pr.repository.name)
            }
          })

          users.value = Array.from(usersSet)
          colleges.value = Array.from(collegesSet)
          owners.value = Array.from(ownersSet)
          repositories.value = Array.from(repositoriesSet)
        })
        .catch((error) => {
          console.error('Error fetching PRs:', error)
        })

      fetch(`${API_BASE}/api/admin/statistics?adminPassword=${adminPassword}`)
        .then((response) => response.json())
        .then((data) => {
          statistics.value = data
        })
        .catch((error) => {
          console.error('Error fetching statistics:', error)
        })
    }

    fetchData()

    const displayedPRs = computed(() => {
      let filteredPRs = prs.value

      if (selectedCollege.value) {
        filteredPRs = filteredPRs.filter(
          (pr) => pr.college === selectedCollege.value
        )
      }

      if (selectedOwner.value) {
        filteredPRs = filteredPRs.filter(
          (pr) => pr.repository.owner === selectedOwner.value
        )
      }

      if (selectedRepository.value) {
        filteredPRs = filteredPRs.filter(
          (pr) => pr.repository.name === selectedRepository.value
        )
      }

      if (selectedUser.value) {
        filteredPRs = filteredPRs.filter(
          (pr) => pr.user === selectedUser.value.full_name
        )
      }

      return filteredPRs
    })

    const filterByCollege = () => {
      // This function is intentionally left blank as filtering is handled reactively
    }

    const filterByOwner = () => {
      // This function is intentionally left blank as filtering is handled reactively
    }

    const filterByRepository = () => {
      // This function is intentionally left blank as filtering is handled reactively
    }

    const filterByUser = () => {
      // This function is intentionally left blank as filtering is handled reactively
    }

    function redFlagRepository(repositoryId) {
      fetch('/api/redFlagRepository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryId }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log('Red-flagged repository:', data)

          // remove the red-flagged repository's PRs from the list
          prs.value = prs.value.filter(
            (pr) => pr.repository._id !== repositoryId
          )
          displayedPRs.value = displayedPRs.value.filter(
            (pr) => pr.repository._id !== repositoryId
          )
        })
        .catch((error) => {
          console.error('Error red-flagging repository:', error)
        })
    }

    // Search functionality
    function handleSearchInput() {
      clearTimeout(searchTimeout)

      if (!searchQuery.value || searchQuery.value.trim() === '') {
        searchResults.value = []
        return
      }

      searchTimeout = setTimeout(() => {
        fetch(`/api/searchUsers?query=${encodeURIComponent(searchQuery.value)}`)
          .then((response) => response.json())
          .then((data) => {
            searchResults.value = data
          })
          .catch((error) => {
            console.error('Error searching users:', error)
          })
      }, 300) // Debounce 300ms
    }

    function selectUser(user) {
      selectedUser.value = user
      showSearchResults.value = false
      searchQuery.value = user.full_name

      // Fetch user profile and PRs
      fetch(`/api/userProfile/${user._id}`)
        .then((response) => response.json())
        .then((data) => {
          prs.value = data.prs
          userProfileStats.value = data.stats
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error)
        })
    }

    function clearSelection() {
      selectedUser.value = null
      userProfileStats.value = null
      searchQuery.value = ''
      searchResults.value = []
      prs.value = displayedPRs.value
    }

    // // Close search results when clicking outside
    // document.addEventListener('click', (e) => {
    //   if (!e.target.closest('.search-box')) {
    //     showSearchResults.value = false
    //   }
    // })

    const displayStatistics = computed(() => {
      if (selectedUser.value && userProfileStats.value) {
        return userProfileStats.value
      }
      return statistics.value || {}
    })

    return {
      users,
      colleges,
      owners,
      repositories,
      prs,

      displayStatistics,

      redFlagRepository,
      statistics,

      // Search-related
      selectedCollege,
      selectedOwner,
      selectedRepository,
      selectedUser,

      displayedPRs,

      filterByCollege,
      filterByOwner,
      filterByRepository,
      filterByUser,

      searchQuery,
      searchResults,
      showSearchResults,
      userProfileStats,
      handleSearchInput,
      selectUser,
      clearSelection,
    }
  },
}
</script>
