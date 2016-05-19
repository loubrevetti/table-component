# voya-table
table component for deep architecture, this table offers advanced features such as **data model importing, sorting, theming, , adaptive and cell templating**. Tables features are all generated by accessing the following properties listed below. also listen below shows you how to establish properties at a global level vs. column instance level.

###Implementation of table component
1. download repository into local machine
2. run ```npm install```
3. run ```jspm install```
4. with in your application you would write the following tags
  ```
   <voya-table api-url="" api-params={"method":"GET"}>
      <voya-column>address</voya-column>
      <voya-column>city</voya-column>
      <voya-column>state</voya-column>
      <voya-column name="zipcode">zip</voya-column>
    </voya-table>
    ```

  * data model assumption ```{'address':'11 main st', 'city':'wolcott', 'state':'CT', 'zipcode':'06489}```
  
    * *please note* **voya-table** *instaniates the table component object, in order to display data from model obtained by table component you must implement* **voya-column** *for each* **key value** *pair you wish to display. The logic of voya-column will use the column label as the* **key** *to search for in the* **model**. *If the key does not match the column label then you would simply need to add a* **name** *attribute to the* **voya-column** *instance.*
    
#Features
### data model importing *global-instance property*
* **api-url:** property could be either a relative or absolute path to the service that would return a model or a static json file that is loaded with in the application, *note: if it is a static file then please set in api-params the property* **method:GET**
  * ex: ```relative-path: "/src/stub/staticFile.json", absolute-path: "http://www.voya.com/services/tableservice"``` 

* **api-params:** property which allows developer to implement a reuqest body for service call with in table component
  * ex: ```{'method':"POST", 'payload':{'key1':'value1','key2':'value2','key3':'value3'}}```

* **name:** property which allows developer search for key in data model if column label doe snot match key.
  * ex: ```<voya-column name="zipcode">zip</voya-column>```


### sorting *global and column-instance property*
* **sort:** setting sort to true on column instance will allow that instance to have the capability to sort the data model by ascending then descending and finally back to original data, If set on  table then all columns become sortable. **please remember that column instance properites will always override globale properties**
  * ``` column instance: <voya-column sort="true/false"></voya-column>```
  * ``` global instance: <voya-table sort="true/false"></voya-table>```


### theming *global and column-instance property*
* **theme:** setting theme to true on column instance will allow that instance to have the capability to theme that instance in 3 different themes, If set on  table then all columns become that theme. **please remember that column instance properites will always override globale properties**
  * ``` column instance: <voya-column theme="white/orange/red"></voya-column>```
  * ``` global instance: <voya-table theme=""white/orange/red"></voya-table>```

* **row-alternating:** if set true or defined rows will have slight grey backgorund in every other row
  * ``` global instance: <voya-table row-alternating></voya-table>```

* **borders:** 3 values horizontal / vertical / none by default table has borders around all cells
  * ``` global instance: <voya-table borders="horizontal/vertical/none"></voya-table>```

* **width:** sets width on column in percentage it will then even divide the widths of other column instances
  * ```column instance: <voya-column width="60"></voya-column>```

### adaptive *global and column-instance property*
* **mobile-width:** tells the table that when the window width is equal to or less then the implmented value
  * ``` global instance: <voya-table mobile-width="768"></voya-table>```

* **mobile:** if set on column in its adaptive view it will display value in list
  * ```column instance: <voya-column mobile></voya-column>```

* **mobile-label:** if set on column in its adaptive view it will display label in list form cell header
  * ```column instance: <voya-column mobile-label></voya-column>```

### templatling *column-instance property*
* **cell-template:** ability to write inline html to be implemented in column instance
  * ``` column instance: <voya-column cell-template="<a href='${link.href}'>${^link.name}</a>"></voya-column>```
  * **${data model property mapping}:** this signature allows for the table to locgically parse out within the model the value (could be deep nested)to be implemented within the template.
  * **${^data model property mapping}**: the carat indicates that this property should be the actual workable value for the table to work with feautres such as sorting


