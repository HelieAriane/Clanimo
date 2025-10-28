// Not found
export function notFound(_req, res, _next) {
    res.status(404).json({ error: 'not_found' })
  }
  
  // Central error handler
  export function errorHandler(err, _req, res, _next) {
    // Erreurs de validation
    if (err?.type === 'validation') {
      return res.status(400).json({ error: 'validation_error', details: err.details })
    }
    // Mongoose cast / duplicate
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'bad_id' })
    }
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'duplicate_key', key: err.keyValue })
    }
    console.error('[ERROR]', err)
    res.status(500).json({ error: 'server_error' })
  }
  