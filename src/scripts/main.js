function ready(callback) {
    // in case the document is already rendered
    if (document.readyState != 'loading') callback()
    // modern browsers
    else if (document.addEventListener)
        document.addEventListener('DOMContentLoaded', callback)
    // IE <= 8
    else
        document.attachEvent('onreadystatechange', function() {
            if (document.readyState == 'complete') callback()
        })
}

ready(function() {
    document.querySelectorAll('time[datetime]').forEach(function(el) {
        var time = new Date(el.getAttribute('datetime'))
        el.innerText = time.toLocaleString()
    })
})
