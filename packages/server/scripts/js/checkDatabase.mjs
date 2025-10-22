import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from server root (outside packages)
dotenv.config({ path: '/Users/dakshsaini/Desktop/track/server/.env' })

console.log('Connecting to MongoDB...')
console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'NOT FOUND')

try {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected to MongoDB successfully!\n')

  const db = mongoose.connection.db

  // Get all collections
  const collections = await db.listCollections().toArray()
  
  console.log(`📊 Database: ${db.databaseName}`)
  console.log(`📁 Total Collections: ${collections.length}\n`)

  // Get document count for each collection
  for (const collection of collections) {
    const count = await db.collection(collection.name).countDocuments()
    console.log(`📦 ${collection.name}: ${count} documents`)
    
    // Get a sample document to show structure
    if (count > 0) {
      const sample = await db.collection(collection.name).findOne()
      console.log(`   Sample fields:`, Object.keys(sample).join(', '))
      console.log()
    }
  }

  await mongoose.disconnect()
  console.log('✅ Disconnected from MongoDB')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
