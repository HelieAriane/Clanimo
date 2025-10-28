// backend/scripts/fix-user-email-index.js
import mongoose from 'mongoose'
import 'dotenv/config'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI manquant dans .env')

  await mongoose.connect(uri)
  const coll = mongoose.connection.db.collection('users')

  // 1) Drop l’index cassant (si présent)
  try {
    await coll.dropIndex('email_1')
    console.log('Index "email_1" supprimé.')
  } catch (e) {
    console.log('Aucun index "email_1" à supprimer ou déjà supprimé:', e.message)
  }

  // 2) Recrée un index unique **partiel** (ignore documents sans email)
  await coll.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { email: { $exists: true, $ne: null } },
      name: 'email_unique_not_null'
    }
  )
  console.log('Nouvel index "email_unique_not_null" créé (unique sur emails non nuls).')

  await mongoose.disconnect()
  console.log('Fini.')
}

main().catch((err) => {
  console.error('Migration échouée:', err)
  process.exit(1)
})
