# Merchify / Jokester Merch — Kentucky Hackathon project

A playful merch mockup web app built in 24 hours for the Kentucky Hackathon. The app turns short video clips into merch-ready images, applies generated art to 3D product models, and lets users customize and buy items.

We placed 3rd overall and won the bounty. Shoutout decided (our team name).

Credits & roles
---------------
- Griffin Hampton — frontend, complete UI/UX design, Next.js + Three.js code, product customizers, and integration of generated images into the 3D textures. (I made all the code in this repo.)
- Wyatt Lang — implemented the backend service and transcription flow (GPT‑4 integration). He connected the flow that downloads videos, transcribes, and produces image generation requests.
- Landon Pantoja — assisted with Blender model optimization, created the hat, cup, and propane tank models, and delivered UV maps used for customization.

Hackathon details
-----------------
- Event: Kentucky Hackathon
- Timebox: Completed in a 24‑hour sprint
- Result: 3rd place overall and awarded the bounty


Tech stack / tools used
-----------------------
- Frontend: Next.js, React, Three.js
- 3D & assets: Blender (models, UV maps, placement of generated art)
- Backend: Java + Spring Boot (video download, clipping, frame extraction)
- Transcription: GPT‑4 (used to extract spoken context from clips)
- Image generation: NanoBanana (we sent prompt + transcription + frame)
- Video & media: Mux (upload wiring present as placeholder API)
- Payments (placeholder): Stripe (checkout endpoint scaffolded)
- DB / helper: Supabase client helper included as a scaffold

High-level summary
------------------
- Frontend: Next.js + Three.js — a single-page product catalog and multiple product customizers (t-shirt, hat, cup, propane tank). The front-end, UI design, and product customization experience were authored by Griffin Hampton.
- Backend (separate Java/Spring service): downloads/clips videos, extracts frames, transcribes audio (GPT‑4), and asks an image generator (NanoBanana) to produce images using video context. Wyatt Lang built and connected the backend logic and transcription flow.
- Assets: 3D models and UV maps were created/optimized in Blender by Landon Pantoja (also authored hat, cup, and propane tank models). Griffin placed generated images onto the Blender textures in the locations used by the site and wired interactivity in the front end.
- Image generation: generated frames are produced by an image generation service (NanoBanana in our flow) using an ImageGen request that includes transcription context and a prompt.
- Integrations / wireframes: Mux (video upload pipeline), Stripe (checkout), Supabase (placeholder helper / data store) — currently scaffolded as placeholder routes in the repo.

How it works (workflow)
-----------------------
1. Client uploads a video or passes a YouTube/TikTok/Instagram URL to the app.
2. The Java/Spring backend downloads the video (or accepts a local upload), clips the requested time range, and generates a representative frame image.
3. The backend transcribes the clip (GPT‑4 was used for transcription in our hackathon flow) to provide additional context about what's said in the clip.
4. The transcription and user prompt are sent to the image generation service (NanoBanana) to create one or more generated images.
5. The generated image is placed onto a product model's UV map (we used Blender to map the art to the product where we wanted it to appear). The frontend loads that texture into Three.js and displays the 3D model.
6. In the browser the user can change colors, add images and text overlays (UI built in React + canvas), and then proceed to a checkout flow (Stripe placeholder).

Relevant backend snippet (from the Java/Spring service)
---------------------------------------------------
The backend controller we used (example) downloads/clips the video, transcribes it, and requests images from the image gen service. Example (simplified):

```java
@PostMapping("/merch")
@CrossOrigin(origins = "*")
public List<String> merch(@RequestBody VideoClip videoClip) throws Exception {
    UUID id = UUID.randomUUID();

    if ("youtube".equals(videoClip.getVideoSource())) {
        videoDownloadService.downloadYoutubeVideo(videoClip, outputDir, id);
    }

    var inputFilePath = outputDir + id.toString() + ".mp4";
    var outputFilePath = outputDir + id.toString() + "-clip" + ".mp4";

    videoDownloadService.clipVideo(videoClip.getStartTime(), videoClip.getDuration(), inputFilePath, outputFilePath);
    videoDownloadService.generateFrameFromClip(inputFilePath, outputDir, id);

    Resource resource = new FileSystemResource(outputFilePath);
    TranscriptionRequest request = new TranscriptionRequest(resource, "transcribe what is said in the video");
    var response = transcriptionService.transcribe(request); // GPT-4-based transcription in our setup
    var transcription = response.transcription();

    ImageGenRequest igr = new ImageGenRequest();
    igr.setPrompt(videoClip.getPrompt());
    igr.setTranscription(transcription);
    igr.setImgPath(outputDir + id.toString() + "-frame1.jpg");
    igr.setId(id);
    var imgResponse = imageGenService.generate(igr, outputDir); // NanoBanana / image gen integration
    return imgResponse;
}
```

Features implemented in this repo
---------------------------------
- Upload / URL-based video input and local uploads
- Zerg-Rush-style loading mini-game in the home hero (playful interaction while processing)
- Client-side chroma-key handling for generated art (the generator sets transparent areas to a navy hex which we process out on the client for overlay)
- Product customizers for T-shirt, hat, cup, and propane tank using Three.js and UV maps; user can change color, add text and additional images, and reposition overlays
- Small local login system (localStorage) to save and restore user designs
- Checkout wiring (Stripe placeholder) and upload/processing pipeline wiring (Mux placeholder)

Additional 3D asset work and scope
----------------------------------
- Asset count & scope: this project includes five primary product models (T‑shirt, pants, hat, cup, propane tank) plus supporting props and variants used throughout the site and marketing visuals.
- Blender & UV work: all models were created or optimized in Blender — topology cleanup, UV unwrapping, texture placement, and baking where needed. Landon provided the UV maps and additional models; Griffin placed generated art onto the Blender textures prior to export so the frontend could load ready-to-use texture assets.
- Optimization & export: meshes were optimized for web delivery (basic retopology, poly/face reduction where necessary), baked or exported as glTF/GLB, and verified in Three.js scenes with proper UV placement and material setup.
- Runtime customization: the frontend uses those UV maps to dynamically draw user overlays (generated art, user uploads, and text) onto a texture canvas which is uploaded as the product texture in Three.js. This required careful UV alignment and canvas-to-texture mapping to ensure the generated art sits exactly where expected on each product.
- Engineering impact: significant time was spent on 3D asset pipeline work (model cleanup, UV mapping, bake/export, glTF conversion) in addition to the frontend integration — this 3D experience and Three.js expertise were repeatedly highlighted by interviewers/employers during demos.

Running locally
---------------
# NOT POSSIBLE WITHOUT ME SETTING IT UP, SOZ!! CHECK OUT THE DEMO VIDEO AT THE BOTTOM


