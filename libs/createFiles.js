const ProgressBar = require('progress')
const faker = require('faker')
const {
  uploadFileWithConflictStrategy
} = require('cozy-client/dist/models/file')

module.exports = async (
  client,
  filesCount,
  dirId = 'io.cozy.files.root-dir'
) => {
  const bar = new ProgressBar(':bar', { total: filesCount })

  for (let i = 0; i < filesCount; i++) {
    const name = faker.lorem.word()
    const content = faker.lorem.paragraph()
    const buffer = new Buffer.from(content, 'utf-8')

    await uploadFileWithConflictStrategy(client, buffer.toString(), {
      name,
      dirId,
      contentType: 'text/plain',
      conflictStrategy: 'rename'
    })
    bar.tick()
  }
}
