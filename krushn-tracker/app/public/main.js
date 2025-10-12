const { createApp, ref } = Vue

createApp({
  setup() {
    const users = ref([])
    const colleges = ref([])
    const owners = ref([])
    const repositories = ref([])
    const prs = ref([])
    const filteredPRs = ref([])

    const statistics = ref(null)

    // Filter state
    const filters = ref({
      reviewStatus: 'all',
      prStatus: 'all',
      searchQuery: ''
    })

    const activeFiltersCount = ref(0)

    function fetchData() {
      fetch('/api/GitHubPRs')
        .then((response) => response.json())
        .then((data) => {
          // console.log('Fetched PRs:', data)
          // Add stable IDs to each PR based on their order in the original array
          prs.value = data.map((pr, index) => ({
            ...pr,
            stableId: index + 1
          }))
          applyFilters() // Apply filters after fetching
        })
        .catch((error) => {
          console.error('Error fetching PRs:', error)
        })

      fetch('/api/statistics')
        .then((response) => response.json())
        .then((data) => {
          statistics.value = data
        })
        .catch((error) => {
          console.error('Error fetching statistics:', error)
        })
    }

    fetchData()

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
        })
        .catch((error) => {
          console.error('Error red-flagging repository:', error)
        })
    }

    function viewReviewDetails(prId) {
      // Open review details in a new tab or navigate to review dashboard
      window.location.href = `/review-dashboard.html?pr=${prId}`
    }

    function setFilter(filterType, value) {
      filters.value[filterType] = value
      applyFilters()
    }

    function applyFilters() {
      let filtered = [...prs.value]

      // Count active filters
      let count = 0

      // Filter by review status
      if (filters.value.reviewStatus !== 'all') {
        filtered = filtered.filter(pr => {
          const status = pr.review_status || 'pending'
          return status === filters.value.reviewStatus
        })
        count++
      }

      // Filter by PR status
      if (filters.value.prStatus !== 'all') {
        filtered = filtered.filter(pr => {
          if (filters.value.prStatus === 'open') {
            return pr.is_open
          } else if (filters.value.prStatus === 'merged') {
            return pr.is_merged
          } else if (filters.value.prStatus === 'closed') {
            return !pr.is_open && !pr.is_merged
          }
          return true
        })
        count++
      }

      // Filter by search query
      if (filters.value.searchQuery.trim() !== '') {
        const query = filters.value.searchQuery.toLowerCase()
        filtered = filtered.filter(pr => {
          const title = (pr.title || '').toLowerCase()
          const author = (pr.author?.username || '').toLowerCase()
          const authorName = (pr.author?.full_name || '').toLowerCase()
          const repo = (pr.repository?.name || '').toLowerCase()
          const owner = (pr.repository?.owner?.username || '').toLowerCase()

          return title.includes(query) || 
                 author.includes(query) || 
                 authorName.includes(query) ||
                 repo.includes(query) || 
                 owner.includes(query)
        })
        count++
      }

      filteredPRs.value = filtered
      activeFiltersCount.value = count
    }

    function clearFilters() {
      filters.value = {
        reviewStatus: 'all',
        prStatus: 'all',
        searchQuery: ''
      }
      applyFilters()
    }

    return {
      users,
      colleges,
      owners,
      repositories,
      prs,
      filteredPRs,
      filters,
      activeFiltersCount,

      redFlagRepository,
      viewReviewDetails,
      setFilter,
      applyFilters,
      clearFilters,
      statistics,
    }
  },
}).mount('#app')
