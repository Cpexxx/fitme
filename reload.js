// dev helper: hard reload of all scripts (not published)
(async()=>{for(const f of ['core','data','mh','mhdata','body','fit','hair','clothes','outer','shoes','acc','app'])await fetch('js/'+f+'.js?v=7',{cache:'reload'});await fetch('fitme.html',{cache:'reload'});await fetch('dev.js',{cache:'reload'});location.reload();})();
