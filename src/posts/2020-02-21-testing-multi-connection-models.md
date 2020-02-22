---
id: 9439a8f9-55de-4e34-9691-9d20a0365c46
title: Testing multi-connection models
date: 2020-02-21 13:43:00+0200
tags:
    - dev
    - laravel
    - testing
view: post
---

When testing in _Laravel_ with models that have custom connections set, you need a way to force the connection to one of your choosing for the duration of the test.<!--more-->

Let's say you have a _User_ class like this, which stores its data in a non-default database connection:

    namespace App;

    use Illuminate\Database\Eloquent\Model;

    class User extends Model
    {
        protected $connection = 'users';
    }

Now let's suppose your testing connection is called `testing`, and you want to set the model connection to that while testing.

The key is to use a customised connection resolver for the duration of the test.

Put the following code into _tests/ConnectionResolver.php_:

    namespace Tests;

    use Illuminate\Database\ConnectionResolver as IlluminateConnectionResolver;
    use Illuminate\Database\ConnectionResolverInterface;

    class ConnectionResolver extends IlluminateConnectionResolver
    {
        protected $original;
        protected $name;

        public function __construct(
            ConnectionResolverInterface $original,
            string $name
        ) {
            $this->original = $original;
            $this->name = $name;
        }

        public function connection($name = null)
        {
            return $this->original->connection($this->name);
        }

        public function getDefaultConnection()
        {
            return $this->name;
        }
    }

Setup your test as follows in _tests/Unit/ExampleTest.php_:

    namespace Tests\Unit;

    use App\User;
    use Tests\ConnectionResolver;
    use Tests\TestCase;

    class ExampleTest extends TestCase
    {
        public function testConnectionResolver()
        {
            $user = factory(User::class)
                ->connection('testing')
                ->create();
            $this->assertTrue($user->exists);

            $original = User::getConnectionResolver();
            User::setConnectionResolver(
                new ConnectionResolver($original, 'testing')
            );

            $found = User::where('email', $user->email)->first();

            $this->assertNotNull($found);
            $this->assertEquals($user->id, $found->id);
            $this->assertEquals($user->name, $found->name);

            User::setConnectionResolver($original);
        }
    }

In the first few lines we create a user in the _testing_ database using a database factory and we assert that it exists:

    $user = factory(User::class)
        ->connection('testing')
        ->create();
    $this->assertTrue($user->exists);

Next, we get a reference to the existing connection resolver (so we can set it back at the end of the test); then we set our new customised connection resolver on the _User_ model.

    $original = User::getConnectionResolver();
    User::setConnectionResolver(
        new ConnectionResolver($original, 'testing')
    );

Now the meat of the test happens. We try to find the user we have just created at the start of the method. During regular execution, the user would normally store the record using the _users_ connection.

We assert that we find the record created in _testing_ and check a couple of key attributes to be sure:

    $found = User::where('email', $user->email)->first();

    $this->assertNotNull($found);
    $this->assertEquals($user->id, $found->id);
    $this->assertEquals($user->name, $found->name);

Lastly, we reset the original connection resolver so that we don't influence any tests that run after this and cause problems down the line.

    User::setConnectionResolver($original);

## How does this work?

Simple really, the customised connection resolver always answers with the provided connection name and connection when asked. If you send _testing_, it will answer with the _testing_ connection whenever _User_ model needs it:

If we put literal strings into the code it'll be clearer:

    public function connection($name = null)
    {
        return $this->original->connection('testing');
    }

    public function getDefaultConnection()
    {
        return 'testing';
    }

Notice how the parameter _name_ is ignored, and the _testing_ connection is returned from the original connection resolver? The second method changes the default connection to _testing_ to ensure anyone asking gets the required connection.

_Happy Testing!_
