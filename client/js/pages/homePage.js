function renderHomePage() {
    let { page } = getClearPage();
    page.innerHTML = `
    <div class="row">
        <main class="col-sm-8">
            <div class="drop-zone"> 
                <span class="btn btn-primary">Browse</span> 
                <span class="drop-message"> or drop file</span> 
                <input class="file-input" type="file">
            </div>
            <div class="progress hide">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>
            </div>
        </main>
        <aside class="col-sm-4">
            <div class="selected-zone">
                <div class="accordion" id="fileUploadAccordion"></div> 
            </div>
        </aside>
    </div>
    `;

    renderFileUploadElements();
}

function renderFileUploadElements() {
    let dropZone = page.querySelector('.drop-zone');
    let fileInputElement = page.querySelector('.file-input');

    // File dropped into drop zone
    fileInputElement.addEventListener('change',  x => {
        dropZone.classList.remove('on-drop');
        const selectedFile = x.target.files[0];
        console.log(selectedFile);

        if (selectedFile.type !== 'application/pdf') {
            // TODO: Alert - File type not permitted;
            console.log('File Type Not Permitted');
            return;
        }

        uploadFile(selectedFile);
        renderDropZoneElements();
        renderFileUploadElements();
    });

    // File dragged INTO drop zone
    fileInputElement.addEventListener('dragenter', x => {
        dropZone.classList.add('on-drop');
    });

    // File dragged OUT OF drop zone
    fileInputElement.addEventListener('dragleave', x => {
        dropZone.classList.remove('on-drop');
    });
}

function renderDropZoneElements() {
    let dropZoneHtml = `<span class="btn btn-primary">Browse</span> 
                <span class="drop-message"> or drop file</span> 
                <input class="file-input" type="file">
            `;
    document.querySelector('.drop-zone').innerHTML = dropZoneHtml;
}

function uploadFile(selectedFile) {
    const config = {
        onUploadProgress: e => {
            const percentCompleted = Math.round( (e.loaded * 100) / e.total );
            console.log(`Progress ${percentCompleted}`);
            // TODO: Update GUI status progress
            let progressBar = page.querySelector('.progress-bar');
            progressBar.style.width = `${percentCompleted}%`;
            if (e.loaded === e.total) {
                console.log('File upload completed');
                setTimeout(function() {
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.classList.remove('progress-bar-striped');
                    progressBar.classList.add('bg-success');
                }, 700);
            }
        }
    }
    const dataForm = new FormData();
    dataForm.append('file', selectedFile);

    // Show progress bar
    let progressBar = page.querySelector('.progress-bar');
    let progressWrapper = page.querySelector('.progress');
    progressBar.style.width = '0%';
    progressWrapper.classList.remove('hide');

    progressBar.classList.add('progress-bar-animated');
    progressBar.classList.add('progress-bar-striped');
    progressBar.classList.remove('bg-success');

    axios.post('/api/file', dataForm, config).then(res => {
        // TODO: Notify upload
        const { OriginalName, FileFormat, FileName } = res.data.fileInfo;
        console.log(res);
        addItemToSelectedZone(OriginalName, FileFormat, FileName);
    })
    .catch(err => {
        // TODO: Notify Error
        console.log(err)
    });
}

function addItemToSelectedZone(originalName, bodyText, fileName) {
    const accItem = createElement('div',['accordion-item']);
    const accHeader = createElement('h2', ['accordion-header']);
    const btn = createElement('button',['accordion-button'], originalName,[
        {'type':'button'},
        {'data-bs-toggle':'collapse'},
        {'data-bs-target':`#a${fileName}`},
        {'aria-expanded':'true'},
        {'aria-controls': 'a'+ fileName}
    ]);
    let bodyWrapper = createElement('div', ['accordion-collapse','collapse'], "", [
        {'data-bs-parent':"#fileUploadAccordion"},
        {'Id': 'a' + fileName}
    ]);
    const body = createElement('div',['accordion-body'], bodyText);
    bodyWrapper.appendChild(body);
    accHeader.appendChild(btn);
    accItem.appendChild(accHeader);
    accItem.appendChild(bodyWrapper);
    page.querySelector('.accordion').appendChild(accItem);
}






