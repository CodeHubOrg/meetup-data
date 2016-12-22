var fs = require('fs');
var path = require('path');

var assert = require('assert');

assert(process.env.MEETUP_KEY, 'MEETUP_KEY variable isn\'t set on enviroment (use \'set \"MEETUP_KEY=key\"\' on Windows)');

var meetup = require('./lib/meetup')({
    key: process.env.MEETUP_KEY
});


// 1st promise to get number of Codehub members
var promise = new Promise((resolve, reject) => {
    meetup.getGroups(
      {group_urlname: "codehub-bristol"}, 
      (err, resp) => {
        resolve(resp.results[0].members);
        //resolve(764);
        reject(new Error("THere was an error with the reponse from the Meetup API"));
      }
    );
});


function getMemberProfiles(members_number){

  // function to get Profiles of members
  var members = [];
  var count = 1;
  var offset = 0;
  var member_ids = [];

  return new Promise(
      (resolve, reject) => {

      console.log("started");

      var getMembersPart = function(){meetup.getGroupMembers({
                  member_id: 'self',
                  urlname: 'codehub-bristol',
                  page: 100,
                  offset: offset
              }, function(err, resp) {
          if (err) {
              reject('Found error');
          }
           
          let members_part = resp.map(function(member){
              return {
                  "index": count++,
                  "id": member.id,             
                  "name": member.name
              }
          }) 
          console.log("length of partial", members_part.length);

          members_part.forEach(function(member){
              if(member_ids.indexOf(member.id) == -1){
                  member_ids.push(member.id);
                  members.push(member);
              }
          })

          console.log("length", members.length);
          offset++;

          if(members.length < members_number){
              setTimeout(getMembersPart, 200, {
                  member_id: 'self',
                  urlname: 'codehub-bristol',
                  page: 100,
                  offset: offset
              });
          } else {
              // fs.writeFile('../data/members.json', JSON.stringify(members, null, 2));
              resolve(members);
          }
          });
      }
      getMembersPart();

      })
  }

  function getTopicsAllMembers(data){ 
    var m_number = data.length;  

    // var slice_start = 0;
    // var slice_end = 180;
    var members_topics = [];    
    // var counter = 0;  
    var topics_fetched = [];

      return new Promise((resolve, reject) => {
          // data_part = data.slice(slice_start, slice_end);
          // data_length = data_part.length;

          var getTopics = function(){     
              var member = data.shift();                
              meetup.getMemberProfile({
                   "mid": member.id
                  }, function(err, resp){
                    if(resp != null){
                    var bio = resp.bio || "";
                    var topics = resp.topics || array();
                    }
                  if(topics_fetched.indexOf(member.id) == -1){
                    console.log(member.id); 
                    topics_fetched.push(member.id);
                    members_topics.push({
                        "id": member.id,
                        "name": member.name,
                        "bio": bio,
                        "topics": topics
                    });
                  }
              // if(members_topics.length < data_part.length){
              //     setTimeout(getTopics, 100);
              // } else {
                  if(members_topics.length == m_number){
                      // fs.writeFile('../data/topics.json', JSON.stringify(members_topics, null, 2));                      
                      resolve(members_topics);
                  } else {
                      // slice_start += 180;
                      // slice_end =+ 180;
                      // console.log("sliced");
                      console.log(topics_fetched.length);
                      setTimeout(getTopics, 100);
                  }
                    
          });
        }
        getTopics();
      }); // end of Promise
  };


  // 2nd promise to get the profiles of members
  var profile_promise = promise.then(
      members_number => {
          console.log(members_number);
          return getMemberProfiles(members_number);
      },
      (error) => {console.log(error);}
  );

  // 3rd promise to get topics for each member
  var topics_promise = profile_promise.then(
      member_profiles => {

        var member_number = member_profiles.length;
        return getTopicsAllMembers(member_profiles);
      },
      (error) => {console.log(error);}
  );

  // 4th promise to rank the topics
  topics_promise.then(
    topics_members => {
      var ranked_topics = [];

      var topics_count = topics_members.reduce(function(prev, current, index, array){
      if(current.topics){
       current.topics.forEach(function(topic){
          prev[topic.name] = prev[topic.name] || {id: topic.id, name: topic.name, count: 0};
          prev[topic.name].count++;
          if(ranked_topics.indexOf(prev[topic.name]) == -1){
              ranked_topics.push(prev[topic.name]);
          }
        });
       }
       return prev;
       }, []);
       var topics_sorted = ranked_topics.sort(function(a,b){
          if(a.count >= b.count){
            return -1;
          }
          if(a.count < b.count){
            return 1;
          }
       })
       //console.log(JSON.stringify(topics_sorted))
       console.log(Object.keys(topics_sorted).length);
       fs.writeFile('../data/ranked_topics.json', JSON.stringify(topics_sorted, null, 2));
    }, 
    (error) => {console.log(error);}
  );
