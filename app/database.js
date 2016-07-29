/**
 * Created by Alexandre Roussière on 28/04/2016.
 */
(function($){

    var database;
    //We try to open the Database
    var openDatabaseRequest = window.indexedDB.open("MovieLibrary",1);

    //If the command doesn't work
    openDatabaseRequest.onerror=function(e){
        console.log('Fail to open the Database');
    };

    //If the DB doesn't exist we create it
    openDatabaseRequest.onupgradeneeded=function(e){
        console.log('Updating database');
        var thisDB = e.target.result;
        //We look if the Movie already exists
        if(!thisDB.objectStoreNames.contains("Movies")){
            var store = thisDB.createObjectStore("Movies",{autoIncrement: true});
        }

    };

    //If it's succeed
    openDatabaseRequest.onsuccess=function(e){
        console.log('Success to open the Database');
        database=e.target.result;


        //If the user click on the saveNote button
        /*
        document.getElementById('saveNote_btn').addEventListener("click",function(){

            console.log('save button clicked');

            //We take our inputs and create an object note with them
            var movie= new Object();
            note.name = escapeHTML(document.getElementById('addName').value);
            note.subject = escapeHTML(document.getElementById('addSubject').value);
            note.message = escapeHTML(document.getElementById('addMessage').value);
            note.date = new Date().toLocaleString();
            note.charNb = parseInt(note.message.length);


            if(!note.name.trim()){
                alert("name must not be null");
            }else if(!note.subject.trim()){
                alert("subject must not be null");
            }else if(!note.message.trim()){
                alert("message must not be null");
            }
            else{
                addNote(note);
            }

        });
*/
        //We display the list as soon as the page is loaded.
        updateList();
    };

    function addNote(myNote){
        console.log('adding name ' + myNote.name);
        var transaction = database.transaction(["Notes"],"readwrite");
        var store = transaction.objectStore("Notes");

        //Save the the object note
        var request = store.add(myNote);
        request.onerror=function(){
            console.log('fail to add the Note ' + myNote.name);
        }
        request.onsuccess=function(){
            console.log("Success adding the Note " + myNote.name);
            updateList();
            //Make empty all the fields in the popup
            document.getElementById('addName').value = "" ;
            document.getElementById('addSubject').value = "";
            document.getElementById('addMessage').value = "";
        }
    }

    function updateList(){
        //Update the HTMl of the list
        $('#listView').empty();

        //Count the Notes in the Database
        var transaction=database.transaction(["Notes"],"readonly");
        var store = transaction.objectStore("Notes");
        var countNotesRequest = store.count();

        //If it's succeed
        countNotesRequest.onsuccess=function(){
            console.log('Success to count the Notes: ' + countNotesRequest.result);
            $('#Header_list').empty();
            if(countNotesRequest.result == 0){
                $headerList = $('<h2><strong>You have no Note to display...</strong></h2>')
            }else{
                $headerList = $('<h2><strong><u>You have ' + countNotesRequest.result + ' Note(s): </u></strong></h2>');
                $('#listView').html('<table><tr><th>Subject</th><th>Created on</th><th>Lenght</th></tr></table>');
            }
            $('#Header_list').append($headerList);

        }

        //Get all the objects in the DB
        var objectStore = database.transaction("Notes").objectStore("Notes");
        objectStore.openCursor().onsuccess=function(event){

            var cursor = event.target.result;

            //If there is something to display
            if(cursor && countNotesRequest.result!=0){

                var $link=$('<a href="#" data-key="' + cursor.key + '">' + cursor.value.subject + '</a>');


                //We set up our row in the table
                var $row=$('<tr></tr>');
                var $subjectCell=$('<td></td>').append($link);
                var $dateCell=$('<td>' + cursor.value.date + '</td>');
                var $lenghtCell=$('<td>' + cursor.value.charNb + '</td>');

                $row.append($subjectCell);
                $row.append($dateCell);
                $row.append($lenghtCell);

                //We add the row to the listView
                $('#listView table').append($row);
                $('#listView table').addClass("table table-hover");
                cursor.continue();

                //If the user click on the subject of the Note, it loads all the information
                $link.click(function() {
                    console.log('note ' + parseInt($link.attr("data-key")) + ' clicked');
                    $('#deleteNote_btn').empty();

                    loadNoteByKey(parseInt($(this).attr('data-key')));
                });

            }else{
                //Stop
            }
        };
    }

    function loadNoteByKey(myKey){

        console.log('Loading the note with key: ' + myKey);
        var transaction = database.transaction(["Notes"],"readonly");
        var store = transaction.objectStore("Notes");
        var getNoteRequest = store.get(myKey);


        getNoteRequest.onerror=function(event){
            console.log('Fail to load the note ' + myKey);
        };

        getNoteRequest.onsuccess=function(event){

            console.log('Success to load the note with key: ' + myKey);

            //Nice effect
            $('#detailView').fadeOut('slow', function() {

                //We fill all the fields
                document.getElementById('name').value = getNoteRequest.result.name ;
                document.getElementById('subject').value = getNoteRequest.result.subject;
                document.getElementById('message').value = getNoteRequest.result.message;

                $showDate = $('<p><strong>Created on: </strong>' + getNoteRequest.result.date + '</p>');
                $showLenght = $('<p><strong>Lenght:</strong> ' + getNoteRequest.result.charNb + '</p>');

                //Refresh the fields
                $('#dateField').empty().append($showDate);
                $('#lenghtField').empty().append($showLenght);

                $('#detailView').toggle("drop");
            });;

            //We create a button to delete the note
            $deleteBtn = $('<button>Delete</button>');

            $deleteBtn.click(function() {
                console.log('Button delete pressed on the note ' + myKey);
                deleteNote(myKey);
            });

            //We add the button to the view
            $deleteBtn.addClass('btn btn-danger');
            $('#deleteNote_btn').append($deleteBtn);
        };
    }

    function deleteNote(key){
        console.log('Delete note ' + key);

        var transaction=database.transaction(["Notes"],"readwrite");
        var store = transaction.objectStore("Notes");
        var deleteRequest = store.delete(key);

        deleteRequest.onerror=function(){
            console.log('Fail to delete note ' + key);
        }
        deleteRequest.onsuccess=function(e){
            console.log('delete successful on ' + key);
            $('#detailView').effect('blind');
            updateList();
            $('#deleteNote_btn').empty();

        };
    }

    //To prevent from script injection
    function escapeHTML(text){
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

})(jQuery);