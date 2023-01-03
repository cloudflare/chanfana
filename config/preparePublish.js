var fs = require('fs')

const files = ['package.json']

for (const file of files) {
  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      return console.log(err)
    }

    const version = process.env.RELEASE_VERSION.replace('v', '')
    const result = data.replace('0.0.1', version)

    fs.writeFile(file, result, 'utf8', function (err) {
      if (err) return console.log(err)
    })
  })
}
