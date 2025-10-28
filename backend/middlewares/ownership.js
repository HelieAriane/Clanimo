import Dog from '../models/Dog.js'

export async function ensureDogOwner(req, res, next) {
  try {
    const { id } = req.params
    const dog = await Dog.findById(id).lean()
    if (!dog) return res.status(404).json({ error: 'dog_not_found' })
    if (dog.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'forbidden' })
    }
    next()
  } catch (e) {
    return res.status(500).json({ error: 'server_error' })
  }
}
