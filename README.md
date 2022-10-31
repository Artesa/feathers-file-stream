# feathers-file-stream

```shell
npm i @artesa/feathers-file-stream
```

## Usage with express & multer@next (multer v2) with fs storage

```ts
import multer from "multer";
import {
  expressHandleStreams,
  ServiceFileStreamFS,
  expressMiddlewareStream
} from "@artesa/feathers-file-stream";
const multerInstance = multer();

app.use(
  "/uploads",
  multerInstance.array("files"),
  expressHandleStreams({ field: "files", isArray: true }),
  new ServiceFileStreamFS({
    root: path.join(__dirname, ".uploads")
  }),
  expressMiddlewareStream()
);
```

## Usage with express & multer@next (multer v2) with s3

```ts
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import {
  expressHandleStreams,
  ServiceFileStreamS3,
  expressMiddlewareStream
} from "@artesa/feathers-file-stream";
const multerInstance = multer();
const s3 = new S3Client({
  credentials: {
    accessKeyId: "",
    secretAccessKey: ""
  }
});

app.use(
  "/uploads",
  multerInstance.array("files"), // looks for files and puts them in req.files
  expressHandleStreams({ field: "files", isArray: true }), // looks for req.files and puts them in req.body, so that it arrives at the service data object in the create method
  new ServiceFileStreamS3({
    s3: new S3Client({
      credentials: {
        accessKeyId: "",
        secretAccessKey: ""
      }
    }),
    bucket: "my-bucket"
  }),
  expressMiddlewareStream() // pipes the stream for a get request to the response
);
```

## Upload a file with stream

```ts
app.service("uploads").create({
  key: "my-file.txt", // the filename to save
  stream: fs.createReadStream("my-file.txt") // the stream to read
});
```
