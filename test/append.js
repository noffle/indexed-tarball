var Tarball = require('..')
var collect = require('collect-stream')
var fs = require('fs')
var path = require('path')
var tmp = require('tmp')
var Readable = require('stream').Readable
var tar = require('tar-stream')
var test = require('tape')
var fromString = require('../util').fromString

test('can append to a new file', function (t) {
  tmp.dir({unsafeCleanup:true}, function (err, dir, cleanup) {
    t.error(err, 'tmpdir setup')

    var filepath = path.join(dir, 'file.tar')
    var tarball = new Tarball(filepath)
    var data = 'greetings friend!'
    tarball.append('hello.txt', fromString(data), data.length, function (err) {
      t.error(err, 'append ok')

      parseTarball(filepath, function (err, res) {
        t.error(err, 'parsed tarball ok')

        t.equals(res.length, 2, 'two entries')

        t.equals(res[0].name, 'hello.txt', 'contents match')
        t.equals(res[0].type, 'file', 'type matches')
        t.equals(res[0].data.toString(), 'greetings friend!')

        t.equals(res[1].name, '___index.json', 'contents match')
        t.equals(res[1].type, 'file', 'type matches')
        var index = JSON.parse(res[1].data.toString())
        t.deepEquals(index, { 'hello.txt': { offset: 0 } })

        cleanup()
        t.end()
      })
    })
  })
})

test('can append to an existing file', function (t) {
  tmp.dir({unsafeCleanup:true}, function (err, dir, cleanup) {
    t.error(err, 'tmpdir setup')

    var filepath = path.join(dir, 'file.tar')
    var tarball = new Tarball(filepath)
    var data = 'greetings friend!'
    tarball.append('hello.txt', fromString(data), data.length, function (err) {
      t.error(err, 'append ok')

      data = '# beep boop'
      tarball.append('beep.md', fromString(data), data.length, function (err) {
        t.error(err, 'append ok')

        parseTarball(filepath, function (err, res) {
          t.error(err, 'parsed tarball ok')

          t.equals(res.length, 3, '3 entries')

          t.equals(res[0].name, 'hello.txt', 'name matches')
          t.equals(res[0].type, 'file', 'type matches')
          t.equals(res[0].data.toString(), 'greetings friend!', 'content matches')

          t.equals(res[1].name, 'beep.md', 'name matches')
          t.equals(res[1].type, 'file', 'type matches')
          t.equals(res[1].data.toString(), '# beep boop', 'content matches')

          t.equals(res[2].name, '___index.json', 'contents match')
          t.equals(res[2].type, 'file', 'type matches')
          var index = JSON.parse(res[2].data.toString())
          t.deepEquals(index, { 'hello.txt': { offset: 0 } })
          t.deepEquals(index, { 'beep.md': { offset: 0 } })

          cleanup()
          t.end()
        })
      })
    })
  })
})

function parseTarball (filepath, cb) {
  var res = []
  var error

  var ex = tar.extract()
  fs.createReadStream(filepath).pipe(ex)

  ex.on('entry', function (header, stream, next) {
    var e = {
      name: header.name,
      type: header.type
    }
    res.push(e)
    collect(stream, function (err, data) {
      error = err || error
      e.data = data
      next()
    })
  })

  ex.once('finish', cb.bind(null, error, res))
}
